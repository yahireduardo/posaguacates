const express = require('express');
const db = require('../db/conexion');
const { permitirRoles } = require('../middleware/auth');
const { esCantidadValida, mensajeCantidad } = require('../lib/cantidades');
const router = express.Router();

const estados = ['BORRADOR', 'PENDIENTE', 'CONVERTIDA', 'CANCELADA'];
const numeroId = value => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};
function error(message, status = 400) {
  return Object.assign(new Error(message), { status });
}
function detalleValido(items) {
  if (!Array.isArray(items) || !items.length) throw error('La orden debe incluir productos');
  const cantidades = new Map();
  const observaciones = new Map();
  for (const item of items) {
    const id = numeroId(item.producto_id);
    const cantidad = Number(item.cantidad);
    if (!id || !Number.isFinite(cantidad) || cantidad <= 0) throw error('Producto o cantidad inválida');
    cantidades.set(id, (cantidades.get(id) || 0) + cantidad);
    observaciones.set(id, String(item.observaciones || '').trim() || null);
  }
  return { cantidades, observaciones };
}
async function catalogoOrden(connection, clienteId, items, bloquear = false) {
  const { cantidades, observaciones } = detalleValido(items);
  const [[cliente]] = await connection.query(
    'SELECT id, nombre_razon_social FROM clientes WHERE id = ? AND activo = 1', [clienteId]
  );
  if (!cliente) throw error('Cliente no encontrado o inactivo', 404);
  const ids = [...cantidades.keys()].sort((a, b) => a - b);
  const [productos] = await connection.query(
    `SELECT id, codigo, nombre, precio_venta, stock, unidad, activo
     FROM productos WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY id${bloquear ? ' FOR UPDATE' : ''}`, ids
  );
  if (productos.length !== ids.length || productos.some(p => !p.activo)) {
    throw error('Uno o más productos no existen o están inactivos', 409);
  }
  const detalle = productos.map(p => {
    const cantidad = Number(cantidades.get(p.id));
    if (!esCantidadValida(cantidad, p.unidad)) throw error(mensajeCantidad(p.unidad));
    const precio = Number(p.precio_venta);
    return { ...p, cantidad, precio, subtotal: Number((cantidad * precio).toFixed(2)),
      observaciones: observaciones.get(p.id) };
  });
  return { cliente, detalle, total: Number(detalle.reduce((s, p) => s + p.subtotal, 0).toFixed(2)) };
}

router.get('/pendientes', async (req, res) => {
  req.query.estado = 'PENDIENTE';
  return listar(req, res);
});
router.get('/', listar);
async function listar(req, res) {
  const where = ['1=1'];
  const params = [];
  const estado = String(req.query.estado || '').toUpperCase();
  if (estado && estados.includes(estado)) { where.push('ov.estado = ?'); params.push(estado); }
  if (req.query.folio) { where.push('ov.folio LIKE ?'); params.push(`%${String(req.query.folio).trim()}%`); }
  if (req.query.cliente) { where.push('c.nombre_razon_social LIKE ?'); params.push(`%${String(req.query.cliente).trim()}%`); }
  if (req.query.fecha) { where.push('DATE(ov.creada_at) = ?'); params.push(req.query.fecha); }
  if (numeroId(req.query.usuario_id)) { where.push('ov.usuario_id = ?'); params.push(Number(req.query.usuario_id)); }
  try {
    const [rows] = await db.promise.query(
      `SELECT ov.id, ov.folio, ov.estado, ov.observaciones, ov.total_estimado, ov.venta_id,
              ov.creada_at, ov.actualizada_at, c.id cliente_id, c.nombre_razon_social cliente,
              u.nombre usuario
       FROM ordenes_venta ov JOIN clientes c ON c.id=ov.cliente_id
       JOIN usuarios u ON u.id=ov.usuario_id WHERE ${where.join(' AND ')}
       ORDER BY ov.id DESC LIMIT 500`, params
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'No fue posible consultar órdenes; verifica la migración pendiente' }); }
}

router.get('/:id', async (req, res) => {
  const id = numeroId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Orden inválida' });
  try {
    const [[orden]] = await db.promise.query(
      `SELECT ov.*, c.nombre_razon_social cliente, u.nombre usuario
       FROM ordenes_venta ov JOIN clientes c ON c.id=ov.cliente_id
       JOIN usuarios u ON u.id=ov.usuario_id WHERE ov.id=?`, [id]
    );
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
    const [productos] = await db.promise.query(
      `SELECT dov.*, p.codigo, p.nombre, p.unidad, p.precio_venta precio_actual, p.stock, p.activo,
              (p.precio_venta <> dov.precio_estimado) precio_modificado
       FROM detalle_orden_venta dov JOIN productos p ON p.id=dov.producto_id
       WHERE dov.orden_id=? ORDER BY dov.id`, [id]
    );
    res.json({ orden, productos });
  } catch (e) { res.status(500).json({ error: 'No fue posible consultar la orden' }); }
});

router.post('/', guardar);
router.put('/:id', permitirRoles('ADMON_GRAL'), guardar);
async function guardar(req, res) {
  const id = req.method === 'PUT' ? numeroId(req.params.id) : null;
  const clienteId = numeroId(req.body.cliente_id);
  const estado = String(req.body.estado || 'PENDIENTE').toUpperCase();
  if (!clienteId || !['BORRADOR', 'PENDIENTE'].includes(estado)) return res.status(400).json({ error: 'Datos de orden inválidos' });
  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    if (id) {
      const [[actual]] = await connection.query('SELECT estado FROM ordenes_venta WHERE id=? FOR UPDATE', [id]);
      if (!actual) throw error('Orden no encontrada', 404);
      if (!['BORRADOR', 'PENDIENTE'].includes(actual.estado)) throw error('La orden ya no puede editarse', 409);
    }
    const calculo = await catalogoOrden(connection, clienteId, req.body.productos);
    let ordenId = id;
    if (id) {
      await connection.query(
        'UPDATE ordenes_venta SET cliente_id=?, estado=?, total_estimado=? WHERE id=?',
        [clienteId, estado, calculo.total, id]
      );
      await connection.query('DELETE FROM detalle_orden_venta WHERE orden_id=?', [id]);
    } else {
      const [result] = await connection.query(
        `INSERT INTO ordenes_venta (folio,cliente_id,usuario_id,estado,total_estimado)
         VALUES ('PENDIENTE',?,?,?,?)`,
        [clienteId, req.usuario.id, estado, calculo.total]
      );
      ordenId = result.insertId;
      await connection.query("UPDATE ordenes_venta SET folio=CONCAT('OV-',LPAD(id,8,'0')) WHERE id=?", [ordenId]);
    }
    for (const p of calculo.detalle) {
      await connection.query(
        `INSERT INTO detalle_orden_venta
         (orden_id,producto_id,cantidad,precio_estimado,subtotal_estimado,observaciones)
         VALUES (?,?,?,?,?,?)`, [ordenId, p.id, p.cantidad, p.precio, p.subtotal, p.observaciones]
      );
    }
    await connection.commit();
    res.status(id ? 200 : 201).json({ mensaje: id ? 'Orden actualizada' : 'Orden creada', orden_id: ordenId, total_estimado: calculo.total });
  } catch (e) {
    await connection.rollback();
    res.status(e.status || 500).json({ error: e.status ? e.message : 'No fue posible guardar la orden' });
  } finally { connection.release(); }
}

router.post('/:id/cancelar', permitirRoles('ADMON_GRAL'), async (req, res) => {
  const id = numeroId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Orden inválida' });
  try {
    const [result] = await db.promise.query(
      `UPDATE ordenes_venta SET estado='CANCELADA'
       WHERE id=? AND estado IN ('BORRADOR','PENDIENTE')`, [id]
    );
    if (!result.affectedRows) return res.status(409).json({ error: 'La orden no existe o ya no puede cancelarse' });
    res.json({ mensaje: 'Orden cancelada' });
  } catch (e) { res.status(500).json({ error: 'No fue posible cancelar la orden' }); }
});

router.post('/:id/convertir', async (req, res) => {
  const ordenId = numeroId(req.params.id);
  const tipoPago = String(req.body.tipo_pago || '').toUpperCase();
  const items = req.body.productos;
  if (!ordenId || !['CONTADO', 'CREDITO'].includes(tipoPago)) return res.status(400).json({ error: 'Conversión inválida' });
  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    const [[orden]] = await connection.query('SELECT * FROM ordenes_venta WHERE id=? FOR UPDATE', [ordenId]);
    if (!orden) throw error('Orden no encontrada', 404);
    if (orden.estado !== 'PENDIENTE' || orden.venta_id) throw error('La orden ya no está disponible', 409);
    const productosEntrada = Array.isArray(items) && items.length ? items :
      (await connection.query('SELECT producto_id,cantidad FROM detalle_orden_venta WHERE orden_id=?', [ordenId]))[0];
    const calculo = await catalogoOrden(connection, orden.cliente_id, productosEntrada, true);
    for (const p of calculo.detalle) if (Number(p.stock) < p.cantidad) throw error(`Stock insuficiente para ${p.nombre}`, 409);
    const [venta] = await connection.query(
      `INSERT INTO ventas (cliente_id,usuario_id,total,tipo_pago,estado_pago,estado_venta,impresiones)
       VALUES (?,?,?,?,?,'ACTIVA',0)`,
      [orden.cliente_id, req.usuario.id, calculo.total, tipoPago, tipoPago === 'CONTADO' ? 'PAGADO' : 'PENDIENTE']
    );
    for (const p of calculo.detalle) {
      await connection.query('INSERT INTO detalle_venta (venta_id,producto_id,cantidad,precio_unitario,subtotal) VALUES (?,?,?,?,?)',
        [venta.insertId, p.id, p.cantidad, p.precio, p.subtotal]);
      const [stock] = await connection.query('UPDATE productos SET stock=stock-? WHERE id=? AND stock>=?', [p.cantidad, p.id, p.cantidad]);
      if (!stock.affectedRows) throw error(`Stock insuficiente para ${p.nombre}`, 409);
      await connection.query(
        `INSERT INTO movimientos_inventario (producto_id,tipo,cantidad,motivo,referencia_id,usuario_id)
         VALUES (?,'SALIDA',?,'VENTA',?,?)`, [p.id, p.cantidad, venta.insertId, req.usuario.id]
      );
    }
    if (tipoPago === 'CREDITO') {
      const [cuenta] = await connection.query(
        `INSERT INTO cuentas_por_cobrar (venta_id,cliente_id,total_deuda,saldo_pendiente,estado)
         VALUES (?,?,?,?,'PENDIENTE')`, [venta.insertId, orden.cliente_id, calculo.total, calculo.total]
      );
      await connection.query(
        `INSERT INTO movimientos_cartera
         (cliente_id,venta_id,cuenta_id,fecha,concepto,folio,cargo,credito,saldo_resultante,descripcion,usuario_id)
         VALUES (?,?,?,NOW(),'VENTA_CREDITO',?,?,0,?,'Venta a crédito',?)`,
        [orden.cliente_id, venta.insertId, cuenta.insertId, venta.insertId, calculo.total, calculo.total, req.usuario.id]
      );
    }
    await connection.query(
      "UPDATE ordenes_venta SET estado='CONVERTIDA',venta_id=?,convertida_at=NOW() WHERE id=?",
      [venta.insertId, ordenId]
    );
    await connection.commit();
    res.status(201).json({ mensaje: 'Orden convertida', venta_id: venta.insertId, total: calculo.total, productos: calculo.detalle });
  } catch (e) {
    await connection.rollback();
    res.status(e.status || 500).json({ error: e.status ? e.message : 'No fue posible convertir la orden' });
  } finally { connection.release(); }
});

module.exports = router;
