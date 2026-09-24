const express = require('express');
const db = require('../db/conexion');
const { permitirRoles } = require('../middleware/auth');
const { esCantidadValida, mensajeCantidad } = require('../lib/cantidades');
const { obtenerClave, validarClave, huella } = require('../lib/idempotencia');
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
  let clave;
  try { clave = validarClave(obtenerClave(req)); }
  catch (error) { return res.status(error.status).json({ error: error.message }); }
  const referenciaTipo = String(req.body.referencia_tipo || 'MANUAL').trim();
  const referenciaId = req.body.referencia_id || null;
  const fingerprint = huella({ producto_id: productoId, tipo, cantidad, motivo,
    referencia_tipo: referenciaTipo, referencia_id: referenciaId });

  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    // Siempre bloquear primero el producto: un orden único evita deadlocks entre
    // dos claves nuevas que afectan simultáneamente el mismo stock.
    const [productos] = await connection.query('SELECT stock, unidad FROM productos WHERE id = ? AND activo = 1 FOR UPDATE', [productoId]);
    if (!productos.length) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
    const [existentes] = await connection.query(
      'SELECT id,stock_final,idempotency_fingerprint FROM movimientos_inventario WHERE idempotency_key=? FOR UPDATE', [clave]
    );
    if (existentes.length) {
      if (existentes[0].idempotency_fingerprint !== fingerprint) {
        throw Object.assign(new Error('La clave de idempotencia ya fue usada con otro movimiento'), { status: 409 });
      }
      await connection.commit();
      return res.json({ mensaje: 'Movimiento ya registrado', movimiento_id: existentes[0].id,
        stock: Number(existentes[0].stock_final), repetido: true });
    }
    if (!esCantidadValida(cantidad, productos[0].unidad)) {
      throw Object.assign(new Error(mensajeCantidad(productos[0].unidad)), { status: 400 });
    }
    const stockAnterior = Number(productos[0].stock);
    const nuevoStock = tipo === 'AJUSTE' ? cantidad : stockAnterior + (tipo === 'ENTRADA' ? cantidad : -cantidad);
    if (nuevoStock < 0) throw Object.assign(new Error('Stock insuficiente'), { status: 409 });
    await connection.query('UPDATE productos SET stock = ? WHERE id = ?', [nuevoStock, productoId]);
    await connection.query(
      `INSERT INTO movimientos_inventario
       (producto_id,tipo,cantidad,stock_anterior,stock_final,motivo,referencia_tipo,referencia_id,usuario_id,idempotency_key,idempotency_fingerprint)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [productoId,tipo,tipo === 'AJUSTE' ? Math.abs(nuevoStock-stockAnterior) : cantidad,
        stockAnterior,nuevoStock,motivo,referenciaTipo,referenciaId,req.usuario.id,clave,fingerprint]
    );
    await connection.commit();
    res.status(201).json({ mensaje: 'Movimiento registrado', stock: nuevoStock });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      const [rows] = await db.promise.query(
        'SELECT id,stock_final,idempotency_fingerprint FROM movimientos_inventario WHERE idempotency_key=?', [clave]
      );
      if (rows[0]?.idempotency_fingerprint === fingerprint) {
        return res.json({ mensaje: 'Movimiento ya registrado', movimiento_id: rows[0].id,
          stock: Number(rows[0].stock_final), repetido: true });
      }
      if (rows.length) return res.status(409).json({ error: 'La clave de idempotencia ya fue usada con otro movimiento' });
    }
    res.status(error.status || 500).json({ error: error.status ? error.message : 'No fue posible registrar el movimiento' });
  } finally { connection.release(); }
});

module.exports = router;
