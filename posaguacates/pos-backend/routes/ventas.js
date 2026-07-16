const express = require('express');
const db = require('../db/conexion');
const { permitirRoles } = require('../middleware/auth');
const router = express.Router();

router.get('/', permitirRoles('ADMON_GRAL'), async (req, res) => {
  try {
    const [rows] = await db.promise.query(
      `SELECT v.id, v.total, v.tipo_pago, v.estado_pago, v.estado_venta, v.fecha,
              c.nombre_razon_social AS cliente, u.username
       FROM ventas v
       LEFT JOIN clientes c ON c.id = v.cliente_id
       LEFT JOIN usuarios u ON u.id = v.usuario_id
       ORDER BY v.id DESC LIMIT 100`
    );
    res.json(rows);
  } catch (error) { res.status(500).json({ error: 'No fue posible consultar ventas' }); }
});

router.post('/crear', async (req, res) => {
  const clienteId = Number(req.body.cliente_id);
  const tipoPago = String(req.body.tipo_pago || '').toUpperCase();
  const productos = Array.isArray(req.body.productos) ? req.body.productos : [];

  if (!Number.isInteger(clienteId) || clienteId <= 0 || !['CONTADO', 'CREDITO'].includes(tipoPago) || !productos.length) {
    return res.status(400).json({ error: 'Datos de venta incompletos' });
  }

  const cantidades = new Map();
  for (const item of productos) {
    const id = Number(item.producto_id);
    const cantidad = Number(item.cantidad);
    if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(cantidad) || cantidad <= 0) {
      return res.status(400).json({ error: 'Producto o cantidad inválida' });
    }
    cantidades.set(id, (cantidades.get(id) || 0) + cantidad);
  }

  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    const [clientes] = await connection.query('SELECT id FROM clientes WHERE id = ? AND activo = 1', [clienteId]);
    if (!clientes.length) throw Object.assign(new Error('Cliente no encontrado'), { status: 404 });

    const ids = [...cantidades.keys()];
    const placeholders = ids.map(() => '?').join(',');
    const [catalogo] = await connection.query(
      `SELECT id, nombre, precio_venta, stock FROM productos
       WHERE activo = 1 AND id IN (${placeholders}) ORDER BY id FOR UPDATE`, ids
    );
    if (catalogo.length !== ids.length) throw Object.assign(new Error('Uno o más productos no existen'), { status: 404 });

    let total = 0;
    const detalle = catalogo.map((producto) => {
      const cantidad = cantidades.get(producto.id);
      if (Number(producto.stock) < cantidad) {
        throw Object.assign(new Error(`Stock insuficiente para ${producto.nombre}`), { status: 409 });
      }
      const precio = Number(producto.precio_venta);
      const subtotal = Number((cantidad * precio).toFixed(2));
      total += subtotal;
      return { ...producto, cantidad, precio, subtotal };
    });
    total = Number(total.toFixed(2));

    const [venta] = await connection.query(
      `INSERT INTO ventas (cliente_id, usuario_id, total, tipo_pago, estado_pago, estado_venta)
       VALUES (?, ?, ?, ?, ?, 'ACTIVA')`,
      [clienteId, req.usuario.id, total, tipoPago, tipoPago === 'CONTADO' ? 'PAGADO' : 'PENDIENTE']
    );

    for (const item of detalle) {
      await connection.query(
        `INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`, [venta.insertId, item.id, item.cantidad, item.precio, item.subtotal]
      );
      const [stock] = await connection.query(
        'UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?',
        [item.cantidad, item.id, item.cantidad]
      );
      if (!stock.affectedRows) throw Object.assign(new Error(`Stock insuficiente para ${item.nombre}`), { status: 409 });
      await connection.query(
        `INSERT INTO movimientos_inventario
         (producto_id, tipo, cantidad, motivo, referencia_id, usuario_id)
         VALUES (?, 'SALIDA', ?, 'VENTA', ?, ?)`,
        [item.id, item.cantidad, venta.insertId, req.usuario.id]
      );
    }

    if (tipoPago === 'CREDITO') {
      await connection.query(
        `INSERT INTO cuentas_por_cobrar (venta_id, cliente_id, total_deuda, saldo_pendiente, estado)
         VALUES (?, ?, ?, ?, 'PENDIENTE')`, [venta.insertId, clienteId, total, total]
      );
    }

    await connection.commit();
    res.status(201).json({
      mensaje: 'Venta registrada', venta_id: venta.insertId, total,
      productos: detalle.map(({ id, nombre, cantidad, precio, subtotal }) => ({ producto_id: id, nombre, cantidad, precio, subtotal }))
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creando venta:', error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'No fue posible registrar la venta' });
  } finally { connection.release(); }
});

router.post('/:ventaId/cancelar', permitirRoles('ADMON_GRAL'), async (req, res) => {
  const ventaId = Number(req.params.ventaId);
  const motivo = String(req.body.motivo || '').trim();
  if (!Number.isInteger(ventaId) || ventaId <= 0 || !motivo) {
    return res.status(400).json({ error: 'Venta y motivo de cancelación son obligatorios' });
  }
  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    const [ventas] = await connection.query('SELECT estado_venta FROM ventas WHERE id = ? FOR UPDATE', [ventaId]);
    if (!ventas.length) throw Object.assign(new Error('Venta no encontrada'), { status: 404 });
    if (ventas[0].estado_venta === 'CANCELADA') throw Object.assign(new Error('La venta ya está cancelada'), { status: 409 });
    const [cuentas] = await connection.query(
      `SELECT cxc.id, cxc.total_deuda, cxc.saldo_pendiente,
              COALESCE(SUM(p.monto), 0) AS abonado
       FROM cuentas_por_cobrar cxc LEFT JOIN pagos p ON p.cuenta_id = cxc.id
       WHERE cxc.venta_id = ? GROUP BY cxc.id FOR UPDATE`, [ventaId]
    );
    if (cuentas.some(c => Number(c.abonado) > 0)) {
      throw Object.assign(new Error('No se puede cancelar una venta a crédito con abonos registrados'), { status: 409 });
    }
    const [detalle] = await connection.query('SELECT producto_id, cantidad FROM detalle_venta WHERE venta_id = ?', [ventaId]);
    for (const item of detalle) {
      await connection.query('UPDATE productos SET stock = stock + ? WHERE id = ?', [item.cantidad, item.producto_id]);
      await connection.query(
        `INSERT INTO movimientos_inventario
         (producto_id, tipo, cantidad, motivo, referencia_id, usuario_id)
         VALUES (?, 'ENTRADA', ?, 'CANCELACION_VENTA', ?, ?)`,
        [item.producto_id, item.cantidad, ventaId, req.usuario.id]
      );
    }
    await connection.query(
      `UPDATE ventas SET estado_venta = 'CANCELADA', cancelada_por = ?, cancelada_at = NOW(), motivo_cancelacion = ?
       WHERE id = ?`, [req.usuario.id, motivo, ventaId]
    );
    await connection.query("UPDATE cuentas_por_cobrar SET estado = 'CANCELADA', saldo_pendiente = 0 WHERE venta_id = ?", [ventaId]);
    await connection.commit();
    res.json({ mensaje: 'Venta cancelada e inventario restaurado' });
  } catch (error) {
    await connection.rollback();
    res.status(error.status || 500).json({ error: error.status ? error.message : 'No fue posible cancelar la venta' });
  } finally { connection.release(); }
});

router.post('/:ventaId/imprimir', async (req, res) => {
  const ventaId = Number(req.params.ventaId);
  if (!Number.isInteger(ventaId) || ventaId <= 0) return res.status(400).json({ error: 'ID de venta inválido' });
  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT impresiones, estado_venta FROM ventas WHERE id = ? FOR UPDATE', [ventaId]);
    if (!rows.length) throw Object.assign(new Error('Venta no encontrada'), { status: 404 });
    if (rows[0].estado_venta === 'CANCELADA') throw Object.assign(new Error('No se puede imprimir una venta cancelada'), { status: 409 });
    const numero = Number(rows[0].impresiones) + 1;
    await connection.query('UPDATE ventas SET impresiones = ?, ultima_impresion_at = NOW() WHERE id = ?', [numero, ventaId]);
    await connection.commit();
    res.json({ venta_id: ventaId, leyenda: numero === 1 ? 'ORIGINAL' : 'COPIA', numero_impresion: numero });
  } catch (error) {
    await connection.rollback();
    res.status(error.status || 500).json({ error: error.status ? error.message : 'No fue posible preparar el ticket' });
  } finally { connection.release(); }
});

module.exports = router;
