const express = require('express');
const db = require('../db/conexion');
const { permitirRoles } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.promise.query(
      'SELECT id, codigo, nombre, precio_venta, stock, stock_minimo, unidad FROM productos WHERE activo = 1 ORDER BY nombre'
    );
    res.json(rows);
  } catch (error) { res.status(500).json({ error: 'No fue posible consultar productos' }); }
});

router.get('/stock-bajo', async (req, res) => {
  try {
    const [rows] = await db.promise.query(
      'SELECT id, nombre, stock, stock_minimo, unidad FROM productos WHERE activo = 1 AND stock <= stock_minimo ORDER BY stock'
    );
    res.json(rows);
  } catch (error) { res.status(500).json({ error: 'No fue posible consultar el stock' }); }
});

router.put('/:id/precio', permitirRoles('ADMON_GRAL'), async (req, res) => {
  const id = Number(req.params.id);
  const precio = Number(req.body.precio_venta);
  if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(precio) || precio < 0) {
    return res.status(400).json({ error: 'Producto o precio inválido' });
  }
  try {
    const [result] = await db.promise.query(
      'UPDATE productos SET precio_venta = ? WHERE id = ? AND activo = 1', [precio, id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Producto no encontrado' });
    return res.json({ mensaje: 'Precio actualizado' });
  } catch (error) { return res.status(500).json({ error: 'No fue posible actualizar el precio' }); }
});

module.exports = router;
