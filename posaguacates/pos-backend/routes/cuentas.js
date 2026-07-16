const express = require('express');
const db = require('../db/conexion');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.promise.query(
      `SELECT c.id AS cliente_id, c.nombre_razon_social,
              SUM(cxc.saldo_pendiente) AS saldo_total
       FROM cuentas_por_cobrar cxc JOIN clientes c ON c.id = cxc.cliente_id
       WHERE cxc.estado = 'PENDIENTE'
       GROUP BY c.id, c.nombre_razon_social ORDER BY saldo_total DESC`
    );
    res.json(rows);
  } catch (error) { res.status(500).json({ error: 'No fue posible consultar cuentas' }); }
});

router.get('/cliente/:id', async (req, res) => {
  const clienteId = Number(req.params.id);
  if (!Number.isInteger(clienteId) || clienteId <= 0) return res.status(400).json({ error: 'Cliente inválido' });
  try {
    const [cuentas] = await db.promise.query(
      `SELECT cxc.id, cxc.venta_id, cxc.total_deuda, cxc.saldo_pendiente, cxc.estado, cxc.fecha
       FROM cuentas_por_cobrar cxc WHERE cxc.cliente_id = ? ORDER BY cxc.id DESC`, [clienteId]
    );
    const [pagos] = await db.promise.query(
      `SELECT p.id, p.cuenta_id, p.monto, p.metodo_pago, p.fecha
       FROM pagos p JOIN cuentas_por_cobrar cxc ON cxc.id = p.cuenta_id
       WHERE cxc.cliente_id = ? ORDER BY p.id DESC`, [clienteId]
    );
    res.json({ cuentas, pagos });
  } catch (error) { res.status(500).json({ error: 'No fue posible consultar el historial' }); }
});

router.post('/abonar', async (req, res) => {
  const cuentaId = Number(req.body.cuenta_id);
  const monto = Number(req.body.monto);
  const metodo = String(req.body.metodo_pago || 'EFECTIVO').trim().toUpperCase();
  if (!Number.isInteger(cuentaId) || cuentaId <= 0 || !Number.isFinite(monto) || monto <= 0 || !metodo) {
    return res.status(400).json({ error: 'Cuenta, monto y método de pago válidos son obligatorios' });
  }
  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT saldo_pendiente, estado FROM cuentas_por_cobrar WHERE id = ? FOR UPDATE', [cuentaId]
    );
    if (!rows.length) throw Object.assign(new Error('Cuenta no encontrada'), { status: 404 });
    if (rows[0].estado !== 'PENDIENTE') throw Object.assign(new Error('La cuenta no admite abonos'), { status: 409 });
    const saldo = Number(rows[0].saldo_pendiente);
    if (monto > saldo) throw Object.assign(new Error('El abono supera el saldo pendiente'), { status: 409 });
    const nuevoSaldo = Number((saldo - monto).toFixed(2));
    // El dump actual aún no contiene tipo_movimiento, saldo_restante ni usuario_id.
    // Esas columnas se proponen en sql/migracion_pendiente.sql sin romper esta ruta.
    await connection.query(
      'INSERT INTO pagos (cuenta_id, monto, metodo_pago) VALUES (?, ?, ?)',
      [cuentaId, monto, metodo]
    );
    await connection.query(
      'UPDATE cuentas_por_cobrar SET saldo_pendiente = ?, estado = ? WHERE id = ?',
      [nuevoSaldo, nuevoSaldo === 0 ? 'PAGADO' : 'PENDIENTE', cuentaId]
    );
    await connection.query(
      `UPDATE ventas v JOIN cuentas_por_cobrar cxc ON cxc.venta_id = v.id
       SET v.estado_pago = ? WHERE cxc.id = ?`,
      [nuevoSaldo === 0 ? 'PAGADO' : 'PENDIENTE', cuentaId]
    );
    await connection.commit();
    res.status(201).json({ mensaje: 'Abono registrado', saldo_pendiente: nuevoSaldo });
  } catch (error) {
    await connection.rollback();
    res.status(error.status || 500).json({ error: error.status ? error.message : 'No fue posible registrar el abono' });
  } finally { connection.release(); }
});

module.exports = router;
