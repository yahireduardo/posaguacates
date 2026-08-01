const express = require('express');
const db = require('../db/conexion');
const { permitirRoles } = require('../middleware/auth');

const router = express.Router();
router.use(permitirRoles('ADMON_GRAL'));
const fallo = (mensaje, status = 400) => Object.assign(new Error(mensaje), { status });

router.get('/', async (req, res, next) => {
  try {
    const proveedorId = Number(req.query.proveedor_id || 0);
    const [cuentas, pagos] = await Promise.all([
      db.promise.query(
        `SELECT cpp.id,cpp.compra_id,cpp.proveedor_id,cpp.total_deuda,cpp.saldo_pendiente,
                cpp.estado,cpp.fecha,p.nombre proveedor,c.folio
         FROM cuentas_por_pagar_proveedores cpp
         JOIN proveedores p ON p.id=cpp.proveedor_id JOIN compras c ON c.id=cpp.compra_id
         WHERE (?=0 OR cpp.proveedor_id=?)
         ORDER BY cpp.estado='PENDIENTE' DESC,cpp.fecha,cpp.id`, [proveedorId, proveedorId]
      ).then(([rows]) => rows),
      db.promise.query(
        `SELECT pp.id,pp.cuenta_id,pp.proveedor_id,pp.monto,pp.metodo_pago,pp.referencia,
                pp.observaciones,pp.fecha,pp.estado,p.nombre proveedor,u.nombre usuario
         FROM pagos_proveedores pp JOIN proveedores p ON p.id=pp.proveedor_id
         JOIN usuarios u ON u.id=pp.usuario_id WHERE (?=0 OR pp.proveedor_id=?)
         ORDER BY pp.fecha DESC,pp.id DESC LIMIT 300`, [proveedorId, proveedorId]
      ).then(([rows]) => rows)
    ]);
    const deudaTotal = cuentas.filter(c => c.estado === 'PENDIENTE')
      .reduce((s, c) => s + Number(c.saldo_pendiente), 0);
    res.json({ deuda_total: Number(deudaTotal.toFixed(2)), cuentas, pagos });
  } catch (error) { next(error); }
});

router.post('/pagos', async (req, res, next) => {
  const cuentaId = Number(req.body.cuenta_id), monto = Number(req.body.monto);
  const metodo = String(req.body.metodo_pago || '').toUpperCase();
  const referencia = String(req.body.referencia || '').trim() || null;
  const observaciones = String(req.body.observaciones || '').trim() || null;
  if (!Number.isInteger(cuentaId) || cuentaId <= 0 || !Number.isFinite(monto) || monto <= 0 ||
      !['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE'].includes(metodo)) {
    return res.status(400).json({ error: 'Cuenta, monto y método de pago válidos son obligatorios' });
  }
  if (metodo !== 'EFECTIVO' && !referencia) {
    return res.status(400).json({ error: 'La referencia es obligatoria para transferencia o cheque' });
  }
  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    const [[cuenta]] = await connection.query(
      `SELECT id,proveedor_id,saldo_pendiente,estado FROM cuentas_por_pagar_proveedores
       WHERE id=? FOR UPDATE`, [cuentaId]
    );
    if (!cuenta) throw fallo('Cuenta por pagar no encontrada', 404);
    if (cuenta.estado !== 'PENDIENTE') throw fallo('La cuenta ya no está pendiente', 409);
    if (monto > Number(cuenta.saldo_pendiente)) throw fallo('El pago no puede superar el saldo pendiente', 409);
    const saldo = Number((Number(cuenta.saldo_pendiente) - monto).toFixed(2));
    const [pago] = await connection.query(
      `INSERT INTO pagos_proveedores
       (cuenta_id,proveedor_id,monto,metodo_pago,referencia,observaciones,usuario_id)
       VALUES (?,?,?,?,?,?,?)`,
      [cuenta.id, cuenta.proveedor_id, monto, metodo, referencia, observaciones, req.usuario.id]
    );
    await connection.query(
      `UPDATE cuentas_por_pagar_proveedores SET saldo_pendiente=?,estado=? WHERE id=?`,
      [saldo, saldo === 0 ? 'PAGADA' : 'PENDIENTE', cuenta.id]
    );
    await connection.query(
      `INSERT INTO auditoria_operaciones(usuario_id,accion,entidad,entidad_id,datos_json)
       VALUES (?,'PAGO_PROVEEDOR','PAGO_PROVEEDOR',?,?)`,
      [req.usuario.id, String(pago.insertId), JSON.stringify({ cuenta_id: cuenta.id, monto, metodo_pago: metodo })]
    );
    await connection.commit();
    res.status(201).json({ pago_id: pago.insertId, saldo_pendiente: saldo, estado: saldo === 0 ? 'PAGADA' : 'PENDIENTE' });
  } catch (error) { await connection.rollback(); next(error); }
  finally { connection.release(); }
});

module.exports = router;
