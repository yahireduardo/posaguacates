const express = require('express');
const db = require('../db/conexion');
const { permitirRoles } = require('../middleware/auth');
const { esCantidadValida } = require('../lib/cantidades');
const { cambiaImporteCompra, calcularStockEditado } = require('../lib/edicionCompra');

const router = express.Router();
router.use(permitirRoles('ADMON_GRAL'));
const fallo = (mensaje, status = 400) => Object.assign(new Error(mensaje), { status });

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.promise.query(
      `SELECT c.id,c.folio,c.referencia,c.observaciones,c.total,c.estado,c.fecha,
              p.nombre proveedor,u.nombre usuario,cpp.id cuenta_id,cpp.saldo_pendiente,cpp.estado estado_cuenta,
              (SELECT COUNT(*) FROM pagos_proveedores pg WHERE pg.cuenta_id=cpp.id AND pg.estado='ACTIVO') pagos_activos
       FROM compras c LEFT JOIN proveedores p ON p.id=c.proveedor_id
       LEFT JOIN usuarios u ON u.id=c.usuario_id
       LEFT JOIN cuentas_por_pagar_proveedores cpp ON cpp.compra_id=c.id
       ORDER BY c.fecha DESC,c.id DESC LIMIT 500`
    );
    res.json(rows);
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [[cabecera], [detalle]] = await Promise.all([
      db.promise.query(
        `SELECT c.*,p.nombre proveedor,u.nombre usuario,cpp.id cuenta_id,cpp.saldo_pendiente,cpp.estado estado_cuenta,
                (SELECT COUNT(*) FROM pagos_proveedores pg WHERE pg.cuenta_id=cpp.id AND pg.estado='ACTIVO') pagos_activos
         FROM compras c LEFT JOIN proveedores p ON p.id=c.proveedor_id
         LEFT JOIN usuarios u ON u.id=c.usuario_id
         LEFT JOIN cuentas_por_pagar_proveedores cpp ON cpp.compra_id=c.id WHERE c.id=?`, [req.params.id]
      ),
      db.promise.query(
        `SELECT d.*,p.codigo,p.nombre FROM detalle_compra d JOIN productos p ON p.id=d.producto_id
         WHERE d.compra_id=? ORDER BY d.id`, [req.params.id]
      )
    ]);
    if (!cabecera[0]) return res.status(404).json({ error: 'Compra no encontrada' });
    res.json({ compra: cabecera[0], productos: detalle });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  const proveedorId = Number(req.body.proveedor_id);
  const items = Array.isArray(req.body.productos) ? req.body.productos : [];
  const key = String(req.get('Idempotency-Key') || req.body.idempotency_key || '').trim();
  const ids = items.map(item => Number(item.producto_id));
  if (!Number.isInteger(proveedorId) || proveedorId <= 0 || !items.length ||
      new Set(ids).size !== ids.length || !/^[A-Za-z0-9._:-]{8,80}$/.test(key)) {
    return res.status(400).json({ error: 'Proveedor, productos sin repetir e Idempotency-Key válido son obligatorios' });
  }
  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    const [[repetida]] = await connection.query('SELECT id,folio,total FROM compras WHERE idempotency_key=? FOR UPDATE', [key]);
    if (repetida) {
      await connection.rollback();
      return res.json({ id: repetida.id, folio: repetida.folio, total: Number(repetida.total), repetida: true });
    }
    const [[proveedor]] = await connection.query('SELECT id FROM proveedores WHERE id=? AND activo=1 FOR UPDATE', [proveedorId]);
    if (!proveedor) throw fallo('Proveedor no disponible', 409);
    let total = 0;
    const detalles = [];
    for (const item of items) {
      const id = Number(item.producto_id), cantidad = Number(item.cantidad), costo = Number(item.costo);
      const [[producto]] = await connection.query(
        'SELECT id,nombre,unidad,stock FROM productos WHERE id=? AND activo=1 FOR UPDATE', [id]
      );
      if (!producto || String(item.unidad || producto.unidad).toUpperCase() !== String(producto.unidad).toUpperCase() ||
          !esCantidadValida(cantidad, producto.unidad) || !Number.isInteger(costo) || costo < 0) {
        throw fallo('Producto, unidad, cantidad o costo inválido', 409);
      }
      const subtotal = Math.round(cantidad * costo * 100) / 100;
      total = Math.round((total + subtotal) * 100) / 100;
      detalles.push({ producto, cantidad, costo, subtotal });
    }
    const folio = String(req.body.folio || `C-${Date.now()}`).trim().replace(/\s+/g, ' ');
    const referencia = String(req.body.referencia || '').trim().replace(/\s+/g, ' ') || null;
    const observaciones = String(req.body.observaciones || '').trim().replace(/\s+/g, ' ') || null;
    const [compra] = await connection.query(
      `INSERT INTO compras(proveedor_id,folio,referencia,observaciones,total,estado,usuario_id,idempotency_key)
       VALUES (?,?,?,?,?,'ACTIVA',?,?)`,
      [proveedorId, folio, referencia, observaciones, total, req.usuario.id, key]
    );
    await connection.query(
      `INSERT INTO cuentas_por_pagar_proveedores
       (compra_id,proveedor_id,total_deuda,saldo_pendiente,estado)
       VALUES (?,?,?,?,?)`,
      [compra.insertId, proveedorId, total, total, total === 0 ? 'PAGADA' : 'PENDIENTE']
    );
    for (const detalle of detalles) {
      await connection.query(
        `INSERT INTO detalle_compra(compra_id,producto_id,cantidad,unidad,precio_compra,subtotal)
         VALUES (?,?,?,?,?,?)`,
        [compra.insertId, detalle.producto.id, detalle.cantidad, detalle.producto.unidad, detalle.costo, detalle.subtotal]
      );
      const stockFinal = Number(detalle.producto.stock) + detalle.cantidad;
      await connection.query('UPDATE productos SET stock=?,costo=? WHERE id=?', [stockFinal, detalle.costo, detalle.producto.id]);
      await connection.query(
        `INSERT INTO movimientos_inventario
         (producto_id,tipo,cantidad,stock_anterior,stock_final,motivo,referencia_tipo,referencia_id,usuario_id)
         VALUES (?,'ENTRADA',?,?,?,'COMPRA','COMPRA',?,?)`,
        [detalle.producto.id, detalle.cantidad, detalle.producto.stock, stockFinal, compra.insertId, req.usuario.id]
      );
      await connection.query(
        `INSERT INTO producto_proveedores(producto_id,proveedor_id,costo_ultimo,ultima_compra_at,activo)
         VALUES (?,?,?,NOW(),1) ON DUPLICATE KEY UPDATE
         costo_ultimo=VALUES(costo_ultimo),ultima_compra_at=VALUES(ultima_compra_at),activo=1`,
        [detalle.producto.id, proveedorId, detalle.costo]
      );
    }
    await connection.commit();
    res.status(201).json({ id: compra.insertId, folio, total });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Folio o solicitud duplicada' });
    next(error);
  } finally { connection.release(); }
});

router.put('/:id', async (req, res, next) => {
  const id = Number(req.params.id), proveedorId = Number(req.body.proveedor_id);
  const items = Array.isArray(req.body.productos) ? req.body.productos : [];
  const ids = items.map(item => Number(item.producto_id));
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(proveedorId) || proveedorId <= 0 ||
      !items.length || new Set(ids).size !== ids.length) {
    return res.status(400).json({ error: 'Compra, proveedor y productos sin repetir son obligatorios' });
  }
  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    const [[compra]] = await connection.query('SELECT * FROM compras WHERE id=? FOR UPDATE', [id]);
    if (!compra) throw fallo('Compra no encontrada', 404);
    if (compra.estado !== 'ACTIVA') throw fallo('Solo se pueden editar compras activas', 409);
    const [[proveedor]] = await connection.query('SELECT id FROM proveedores WHERE id=? AND activo=1 FOR UPDATE', [proveedorId]);
    if (!proveedor) throw fallo('Proveedor no disponible', 409);
    const [[cuenta]] = await connection.query(
      'SELECT id,total_deuda,saldo_pendiente,estado FROM cuentas_por_pagar_proveedores WHERE compra_id=? FOR UPDATE', [id]
    );
    const [anteriores] = await connection.query(
      `SELECT dc.*,p.nombre,p.stock,p.unidad FROM detalle_compra dc JOIN productos p ON p.id=dc.producto_id
       WHERE dc.compra_id=? ORDER BY dc.producto_id FOR UPDATE`, [id]
    );
    const todosIds = [...new Set([...anteriores.map(item => Number(item.producto_id)), ...ids])].sort((a, b) => a - b);
    const [productos] = await connection.query(
      `SELECT id,nombre,unidad,stock,activo FROM productos WHERE id IN (${todosIds.map(() => '?').join(',')}) ORDER BY id FOR UPDATE`, todosIds
    );
    const mapaProductos = new Map(productos.map(producto => [Number(producto.id), producto]));
    let total = 0;
    const nuevos = items.map(item => {
      const producto = mapaProductos.get(Number(item.producto_id));
      const cantidad = Number(item.cantidad), costo = Number(item.costo);
      if (!producto || !producto.activo || String(item.unidad || producto.unidad).toUpperCase() !== String(producto.unidad).toUpperCase() ||
          !esCantidadValida(cantidad, producto.unidad) || !Number.isInteger(costo) || costo < 0) {
        throw fallo('Producto, unidad, cantidad o costo inválido', 409);
      }
      const subtotal = Math.round(cantidad * costo * 100) / 100;
      total = Math.round((total + subtotal) * 100) / 100;
      return { producto, cantidad, costo, subtotal };
    });
    const [[pagos]] = cuenta ? await connection.query(
      "SELECT COUNT(*) total FROM pagos_proveedores WHERE cuenta_id=? AND estado='ACTIVO' FOR UPDATE", [cuenta.id]
    ) : [[{ total: 0 }]];
    const cambiaImporte = cambiaImporteCompra({ compra, proveedorId, total, anteriores, nuevos });
    if (Number(pagos.total) > 0 && cambiaImporte) {
      throw fallo('La compra ya tiene pagos. Solo puedes editar folio, referencia y observaciones', 409);
    }
    const folio = String(req.body.folio || compra.folio || `C-${id}`).trim().replace(/\s+/g, ' ');
    const referencia = String(req.body.referencia || '').trim().replace(/\s+/g, ' ') || null;
    const observaciones = String(req.body.observaciones || '').trim().replace(/\s+/g, ' ') || null;
    if (!cambiaImporte) {
      await connection.query('UPDATE compras SET folio=?,referencia=?,observaciones=? WHERE id=?', [folio, referencia, observaciones, id]);
    } else {
      const cantidadAnterior = new Map(anteriores.map(item => [Number(item.producto_id), Number(item.cantidad)]));
      const cantidadNueva = new Map(nuevos.map(item => [Number(item.producto.id), item.cantidad]));
      for (const productoId of todosIds) {
        const producto = mapaProductos.get(productoId), anterior = cantidadAnterior.get(productoId) || 0, nueva = cantidadNueva.get(productoId) || 0;
        const stockFinal = calcularStockEditado(producto.stock, anterior, nueva), diferencia = Number((nueva - anterior).toFixed(2));
        if (stockFinal == null) throw fallo(`No se puede editar: el stock recibido de ${producto.nombre} ya fue consumido`, 409);
        const detalleNuevo = nuevos.find(item => Number(item.producto.id) === productoId);
        await connection.query('UPDATE productos SET stock=?' + (detalleNuevo ? ',costo=?' : '') + ' WHERE id=?',
          detalleNuevo ? [stockFinal, detalleNuevo.costo, productoId] : [stockFinal, productoId]);
        if (Math.abs(diferencia) > 0.0001) await connection.query(
          `INSERT INTO movimientos_inventario
           (producto_id,tipo,cantidad,stock_anterior,stock_final,motivo,referencia_tipo,referencia_id,usuario_id)
           VALUES (?,?,?,?,?,'EDICION_COMPRA','COMPRA',?,?)`,
          [productoId, diferencia > 0 ? 'ENTRADA' : 'SALIDA', Math.abs(diferencia), producto.stock, stockFinal, id, req.usuario.id]
        );
      }
      await connection.query('DELETE FROM detalle_compra WHERE compra_id=?', [id]);
      for (const detalle of nuevos) {
        await connection.query(
          `INSERT INTO detalle_compra(compra_id,producto_id,cantidad,unidad,precio_compra,subtotal) VALUES (?,?,?,?,?,?)`,
          [id, detalle.producto.id, detalle.cantidad, detalle.producto.unidad, detalle.costo, detalle.subtotal]
        );
        await connection.query(
          `INSERT INTO producto_proveedores(producto_id,proveedor_id,costo_ultimo,ultima_compra_at,activo)
           VALUES (?,?,?,NOW(),1) ON DUPLICATE KEY UPDATE costo_ultimo=VALUES(costo_ultimo),ultima_compra_at=VALUES(ultima_compra_at),activo=1`,
          [detalle.producto.id, proveedorId, detalle.costo]
        );
      }
      await connection.query(
        'UPDATE compras SET proveedor_id=?,folio=?,referencia=?,observaciones=?,total=? WHERE id=?',
        [proveedorId, folio, referencia, observaciones, total, id]
      );
      if (cuenta) await connection.query(
        'UPDATE cuentas_por_pagar_proveedores SET proveedor_id=?,total_deuda=?,saldo_pendiente=?,estado=? WHERE id=?',
        [proveedorId, total, total, total === 0 ? 'PAGADA' : 'PENDIENTE', cuenta.id]
      );
    }
    await connection.query(
      `INSERT INTO auditoria_operaciones(usuario_id,accion,entidad,entidad_id,datos_json)
       VALUES (?,'EDITAR_COMPRA','COMPRA',?,?)`,
      [req.usuario.id, String(id), JSON.stringify({ proveedor_id: proveedorId, total, cambia_importe: cambiaImporte })]
    );
    await connection.commit();
    res.json({ mensaje: 'Compra actualizada correctamente', id, folio, total });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El folio ya pertenece a otra compra' });
    next(error);
  } finally { connection.release(); }
});

router.post('/:id/cancelar', async (req, res, next) => {
  const id = Number(req.params.id), motivo = String(req.body.motivo || '').trim();
  if (!Number.isInteger(id) || id <= 0 || motivo.length < 5) {
    return res.status(400).json({ error: 'Compra y motivo de al menos 5 caracteres son obligatorios' });
  }
  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    const [[compra]] = await connection.query('SELECT * FROM compras WHERE id=? FOR UPDATE', [id]);
    if (!compra) throw fallo('Compra no encontrada', 404);
    if (compra.estado !== 'ACTIVA') throw fallo('La compra ya está cancelada', 409);
    const [[cuenta]] = await connection.query(
      'SELECT id FROM cuentas_por_pagar_proveedores WHERE compra_id=? FOR UPDATE', [id]
    );
    if (cuenta) {
      const [[pagos]] = await connection.query(
        "SELECT COUNT(*) total FROM pagos_proveedores WHERE cuenta_id=? AND estado='ACTIVO' FOR UPDATE", [cuenta.id]
      );
      if (Number(pagos.total) > 0) throw fallo('No se puede cancelar una compra que ya tiene pagos a proveedor', 409);
    }
    const [detalles] = await connection.query(
      `SELECT dc.*,p.stock,p.nombre FROM detalle_compra dc JOIN productos p ON p.id=dc.producto_id
       WHERE dc.compra_id=? ORDER BY dc.producto_id FOR UPDATE`, [id]
    );
    for (const detalle of detalles) {
      const stockFinal = Number(detalle.stock) - Number(detalle.cantidad);
      if (stockFinal < 0) throw fallo(`No se puede cancelar: el stock actual de ${detalle.nombre} ya fue consumido`, 409);
      await connection.query('UPDATE productos SET stock=? WHERE id=?', [stockFinal, detalle.producto_id]);
      await connection.query(
        `INSERT INTO movimientos_inventario
         (producto_id,tipo,cantidad,stock_anterior,stock_final,motivo,referencia_tipo,referencia_id,usuario_id)
         VALUES (?,'SALIDA',?,?,?,'CANCELACION_COMPRA','COMPRA',?,?)`,
        [detalle.producto_id, detalle.cantidad, detalle.stock, stockFinal, id, req.usuario.id]
      );
    }
    await connection.query(
      `UPDATE compras SET estado='CANCELADA',cancelada_por=?,cancelada_at=NOW(),motivo_cancelacion=? WHERE id=?`,
      [req.usuario.id, motivo, id]
    );
    if (cuenta) await connection.query(
      "UPDATE cuentas_por_pagar_proveedores SET saldo_pendiente=0,estado='CANCELADA' WHERE id=?", [cuenta.id]
    );
    await connection.query(
      `INSERT INTO auditoria_operaciones(usuario_id,accion,entidad,entidad_id,motivo)
       VALUES (?,'CANCELAR_COMPRA','COMPRA',?,?)`, [req.usuario.id, String(id), motivo]
    );
    await connection.commit();
    res.json({ mensaje: 'Compra cancelada, deuda anulada y stock revertido' });
  } catch (error) { await connection.rollback(); next(error); }
  finally { connection.release(); }
});

module.exports = router;
