const express = require('express');
const db = require('../db/conexion');
const { permitirRoles } = require('../middleware/auth');
const { esCantidadValida, mensajeCantidad } = require('../lib/cantidades');
const router = express.Router();

router.use(permitirRoles('ADMON_GRAL'));

router.get('/', async (req, res, next) => {
  const tipo = String(req.query.tipo || '').toUpperCase();
  const productoId = Number(req.query.producto_id || 0);
  try {
    const [rows] = await db.promise.query(
      `SELECT mi.id, mi.producto_id, mi.tipo, mi.cantidad,mi.stock_anterior,mi.stock_final,
              mi.motivo,mi.referencia_tipo, mi.referencia_id,
              mi.usuario_id, mi.fecha, p.nombre AS producto, p.unidad
       FROM movimientos_inventario mi JOIN productos p ON p.id = mi.producto_id
       WHERE (?='' OR mi.tipo=?) AND (?=0 OR mi.producto_id=?)
       ORDER BY mi.id DESC LIMIT 500`, [tipo,tipo,productoId,productoId]
    );
    res.json(rows);
  } catch (error) { next(error); }
});

router.post('/movimiento', async (req, res) => {
  const productoId = Number(req.body.producto_id);
  const tipo = String(req.body.tipo || '').toUpperCase();
  const cantidad = Number(req.body.cantidad);
  const motivo = String(req.body.motivo || '').trim();
  if (!Number.isInteger(productoId) || productoId <= 0 || !['ENTRADA', 'SALIDA', 'AJUSTE'].includes(tipo) ||
      !Number.isFinite(cantidad) || cantidad <= 0 || !motivo) {
    return res.status(400).json({ error: 'Movimiento inválido' });
  }

  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    const [productos] = await connection.query('SELECT stock, unidad FROM productos WHERE id = ? AND activo = 1 FOR UPDATE', [productoId]);
    if (!productos.length) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
    if (!esCantidadValida(cantidad, productos[0].unidad)) {
      throw Object.assign(new Error(mensajeCantidad(productos[0].unidad)), { status: 400 });
    }
    const stockAnterior = Number(productos[0].stock);
    const nuevoStock = tipo === 'AJUSTE' ? cantidad : stockAnterior + (tipo === 'ENTRADA' ? cantidad : -cantidad);
    if (nuevoStock < 0) throw Object.assign(new Error('Stock insuficiente'), { status: 409 });
    await connection.query('UPDATE productos SET stock = ? WHERE id = ?', [nuevoStock, productoId]);
    await connection.query(
      `INSERT INTO movimientos_inventario
       (producto_id,tipo,cantidad,stock_anterior,stock_final,motivo,referencia_tipo,referencia_id,usuario_id)
       VALUES (?,?,?,?,?,?,?, ?,?)`, [productoId,tipo,tipo === 'AJUSTE' ? Math.abs(nuevoStock-stockAnterior) : cantidad,
        stockAnterior,nuevoStock,motivo,String(req.body.referencia_tipo||'MANUAL').trim(),req.body.referencia_id||null,req.usuario.id]
    );
    await connection.commit();
    res.status(201).json({ mensaje: 'Movimiento registrado', stock: nuevoStock });
  } catch (error) {
    await connection.rollback();
    res.status(error.status || 500).json({ error: error.status ? error.message : 'No fue posible registrar el movimiento' });
  } finally { connection.release(); }
});

module.exports = router;
