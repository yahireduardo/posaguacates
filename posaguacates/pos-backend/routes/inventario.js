const express = require('express');
const db = require('../db/conexion');
const { permitirRoles } = require('../middleware/auth');
const router = express.Router();

router.use(permitirRoles('ADMON_GRAL'));

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.promise.query(
      `SELECT mi.id, mi.producto_id, mi.tipo, mi.cantidad, mi.motivo, mi.referencia_id,
              mi.usuario_id, mi.fecha, p.nombre AS producto
       FROM movimientos_inventario mi JOIN productos p ON p.id = mi.producto_id
       ORDER BY mi.id DESC LIMIT 500`
    );
    res.json(rows);
  } catch (error) { res.status(500).json({ error: 'No fue posible consultar movimientos' }); }
});

router.post('/movimiento', async (req, res) => {
  const productoId = Number(req.body.producto_id);
  const tipo = String(req.body.tipo || '').toUpperCase();
  const cantidad = Number(req.body.cantidad);
  const motivo = String(req.body.motivo || '').trim();
  if (!Number.isInteger(productoId) || productoId <= 0 || !['ENTRADA', 'SALIDA'].includes(tipo) ||
      !Number.isFinite(cantidad) || cantidad <= 0 || !motivo) {
    return res.status(400).json({ error: 'Movimiento inválido' });
  }

  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    const [productos] = await connection.query('SELECT stock FROM productos WHERE id = ? FOR UPDATE', [productoId]);
    if (!productos.length) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
    const nuevoStock = Number(productos[0].stock) + (tipo === 'ENTRADA' ? cantidad : -cantidad);
    if (nuevoStock < 0) throw Object.assign(new Error('Stock insuficiente'), { status: 409 });
    await connection.query('UPDATE productos SET stock = ? WHERE id = ?', [nuevoStock, productoId]);
    await connection.query(
      `INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, motivo, usuario_id)
       VALUES (?, ?, ?, ?, ?)`, [productoId, tipo, cantidad, motivo, req.usuario.id]
    );
    await connection.commit();
    res.status(201).json({ mensaje: 'Movimiento registrado', stock: nuevoStock });
  } catch (error) {
    await connection.rollback();
    res.status(error.status || 500).json({ error: error.status ? error.message : 'No fue posible registrar el movimiento' });
  } finally { connection.release(); }
});

module.exports = router;
