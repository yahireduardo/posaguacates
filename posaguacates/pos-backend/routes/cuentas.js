const express = require('express');
const db = require('../db/conexion');
const { permitirRoles } = require('../middleware/auth');
const {
  resolverAutorizacionAdmin,
  registrarAuditoriaSiExiste
} = require('../lib/autorizacionAdmin');
const { construirAplicaciones } = require('../lib/cartera');
const { prepararReversionPago } = require('../lib/pagos');
const { normalizarMetodosPago, insertarMetodosPago } = require('../lib/metodosPago');
const router = express.Router();

const idValido = value => Number.isInteger(Number(value)) && Number(value) > 0;
const fallo = (message, status = 400) => Object.assign(new Error(message), { status });

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.promise.query(
      `SELECT c.id cliente_id,c.nombre_razon_social,SUM(cxc.saldo_pendiente) saldo_total
       FROM cuentas_por_cobrar cxc JOIN clientes c ON c.id=cxc.cliente_id
       WHERE cxc.estado='PENDIENTE' GROUP BY c.id,c.nombre_razon_social ORDER BY saldo_total DESC`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'No fue posible consultar cuentas' }); }
});

router.get('/clientes/buscar', async (req, res) => {
  const q = `%${String(req.query.q || '').trim()}%`;
  try {
    const [rows] = await db.promise.query(
      `SELECT c.id,c.nombre_razon_social,c.rfc,c.telefono,c.correo_electronico,
              COALESCE(SUM(CASE WHEN cxc.estado='PENDIENTE' THEN cxc.saldo_pendiente ELSE 0 END),0) saldo_total
       FROM clientes c LEFT JOIN cuentas_por_cobrar cxc ON cxc.cliente_id=c.id
       WHERE c.activo=1 AND (c.nombre_razon_social LIKE ? OR c.rfc LIKE ? OR c.telefono LIKE ? OR c.correo_electronico LIKE ?)
       GROUP BY c.id,c.nombre_razon_social,c.rfc,c.telefono,c.correo_electronico
       ORDER BY c.nombre_razon_social LIMIT 50`, [q, q, q, q]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'No fue posible buscar clientes' }); }
});

router.get('/cliente/:id/pendientes', pendientes);
async function pendientes(req, res) {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Cliente inválido' });
  try {
    const [rows] = await db.promise.query(
      `SELECT cxc.id,cxc.venta_id,CONCAT('V-',LPAD(cxc.venta_id,8,'0')) folio,
              cxc.total_deuda,cxc.saldo_pendiente,cxc.estado,cxc.fecha,NULL vencimiento
       FROM cuentas_por_cobrar cxc WHERE cxc.cliente_id=? AND cxc.estado='PENDIENTE'
       ORDER BY cxc.fecha,cxc.id`, [Number(req.params.id)]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'No fue posible consultar notas pendientes' }); }
}

router.get('/cliente/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Cliente inválido' });
  try {
    const [[cliente]] = await db.promise.query(
      `SELECT id,nombre_razon_social,rfc,telefono,correo_electronico
       FROM clientes WHERE id=? AND activo=1 LIMIT 1`, [Number(req.params.id)]
    );
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    const [cuentas] = await db.promise.query(
      `SELECT cxc.id,cxc.venta_id,cxc.total_deuda,cxc.saldo_pendiente,cxc.estado,cxc.fecha
       FROM cuentas_por_cobrar cxc WHERE cxc.cliente_id=? ORDER BY cxc.fecha,cxc.id`, [Number(req.params.id)]
    );
    const [pagos] = await db.promise.query(
      `SELECT p.id pago_id,ap.id aplicacion_id,ap.cuenta_id,ap.monto_aplicado monto,
              p.estado pago_estado,p.cancelado_at,p.motivo_cancelacion,
              p.metodo_pago,p.fecha,p.referencia,
              (SELECT GROUP_CONCAT(CONCAT(pfp.metodo_pago,': ',FORMAT(pfp.monto,2)) ORDER BY pfp.id SEPARATOR ' + ')
               FROM pago_formas_pago pfp WHERE pfp.pago_id=p.id) metodos_detalle
       FROM pagos p JOIN aplicaciones_pago ap ON ap.pago_id=p.id
       WHERE p.cliente_id=? ORDER BY p.fecha,p.id,ap.id`, [Number(req.params.id)]
    );
    const [movimientos] = await db.promise.query(
      `SELECT mc.id,mc.fecha,mc.concepto,mc.folio,mc.cargo,mc.credito,
              mc.saldo_resultante saldo,mc.descripcion,
              COALESCE(u.nombre,u.username,'Sistema') usuario
       FROM movimientos_cartera mc
       LEFT JOIN usuarios u ON u.id=mc.usuario_id
       WHERE mc.cliente_id=? ORDER BY DATE(mc.fecha) ASC,mc.id ASC`, [Number(req.params.id)]
    );
    res.json({
      cliente,
      cuentas,
      pagos,
      movimientos,
      resumen: {
        saldo_total_pendiente: cuentas.filter(c => c.estado === 'PENDIENTE').reduce((s, c) => s + Number(c.saldo_pendiente), 0),
        total_cuentas: cuentas.length,
        total_pagos: new Set(pagos.map(p => p.pago_id)).size,
        ventas_pendientes: cuentas.filter(c => c.estado === 'PENDIENTE').length,
        pagos_aplicados: new Set(pagos.filter(p => p.pago_estado === 'ACTIVO').map(p => p.pago_id)).size,
        pagos_cancelados: new Set(pagos.filter(p => p.pago_estado === 'CANCELADO').map(p => p.pago_id)).size
      }
    });
  } catch (e) {
    console.error('Error consultando cuenta de cliente:', { clienteId: req.params.id, code: e.code, message: e.message });
    res.status(500).json({ error: 'No fue posible consultar el historial de la cuenta' });
  }
});

router.post('/pagos', permitirRoles('ADMON_GRAL', 'CAJERO'), async (req, res) => {
  const clienteId = Number(req.body.cliente_id);
  const monto = Number(req.body.monto_recibido);
  if (!idValido(clienteId) || !Number.isFinite(monto) || monto <= 0) return res.status(400).json({ error: 'Cliente y monto válidos son obligatorios' });
  let desglose;
  try { desglose = normalizarMetodosPago(req.body, monto); }
  catch (error) { return res.status(error.status || 400).json({ error: error.message }); }
  const metodo = desglose.metodo_resumen, referencia = desglose.referencia_resumen;
  const ids = [...new Set((req.body.cuenta_ids || []).map(Number).filter(idValido))].sort((a, b) => a - b);
  if (!ids.length) return res.status(400).json({ error: 'Selecciona al menos una nota' });
  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    const [cuentas] = await connection.query(
      `SELECT id,cliente_id,venta_id,total_deuda,saldo_pendiente,estado,fecha
       FROM cuentas_por_cobrar WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY fecha,id FOR UPDATE`, ids
    );
    if (cuentas.length !== ids.length) {
      throw fallo('Una de las notas seleccionadas ya no existe. Actualiza la lista e intenta nuevamente', 409);
    }
    if (cuentas.some(c => Number(c.cliente_id) !== clienteId)) {
      throw fallo('Una nota seleccionada no pertenece al cliente', 409);
    }
    if (cuentas.some(c => c.estado !== 'PENDIENTE')) {
      throw fallo('Una nota ya fue pagada o cancelada. Vuelve a seleccionar el cliente para actualizar saldos', 409);
    }
    const aplicaciones = construirAplicaciones(cuentas, req.body, monto);
    const [pago] = await connection.query(
      `INSERT INTO pagos (cuenta_id,monto,metodo_pago,fecha,cliente_id,monto_total,referencia,observaciones,usuario_id)
       VALUES (NULL,NULL,?,NOW(),?,?,?,?,?)`,
      [metodo, clienteId, monto, referencia, String(req.body.observaciones || '').trim() || null, req.usuario.id]
    );
    await insertarMetodosPago(connection, 'pago_formas_pago', 'pago_id', pago.insertId, desglose.metodos);
    const recibo = [];
    for (const a of aplicaciones) {
      const anterior = Number(a.cuenta.saldo_pendiente);
      const nuevo = Number((anterior - a.monto).toFixed(2));
      await connection.query(
        `INSERT INTO aplicaciones_pago (pago_id,cuenta_id,monto_aplicado,saldo_anterior,saldo_resultante)
         VALUES (?,?,?,?,?)`, [pago.insertId, a.cuenta.id, a.monto, anterior, nuevo]
      );
      await connection.query('UPDATE cuentas_por_cobrar SET saldo_pendiente=?,estado=? WHERE id=?',
        [nuevo, nuevo === 0 ? 'PAGADO' : 'PENDIENTE', a.cuenta.id]);
      await connection.query('UPDATE ventas SET estado_pago=? WHERE id=?',
        [nuevo === 0 ? 'PAGADO' : 'PENDIENTE', a.cuenta.venta_id]);
      const [[saldo]] = await connection.query(
        "SELECT COALESCE(SUM(saldo_pendiente),0) total FROM cuentas_por_cobrar WHERE cliente_id=? AND estado='PENDIENTE'", [clienteId]
      );
      await connection.query(
        `INSERT INTO movimientos_cartera
         (cliente_id,venta_id,cuenta_id,pago_id,fecha,concepto,folio,cargo,credito,saldo_resultante,descripcion,usuario_id)
         VALUES (?,?,?,?,NOW(),'COBRO',?,0,?,?,?,?)`,
        [clienteId, a.cuenta.venta_id, a.cuenta.id, pago.insertId, `P-${pago.insertId}`,
          a.monto, saldo.total, String(req.body.observaciones || '').trim() || 'Aplicación de pago', req.usuario.id]
      );
      recibo.push({ cuenta_id: a.cuenta.id, venta_id: a.cuenta.venta_id, monto_aplicado: a.monto, saldo_anterior: anterior, saldo_resultante: nuevo });
    }
    await connection.commit();
    res.status(201).json({ pago_id: pago.insertId, cliente_id: clienteId, monto_total: monto, metodo_pago: metodo, metodos_pago: desglose.metodos, referencia, aplicaciones: recibo });
  } catch (e) {
    await connection.rollback();
    res.status(e.status || 500).json({ error: e.status ? e.message : 'No fue posible aplicar el pago' });
  } finally { connection.release(); }
});

router.post('/pagos/:id/cancelar', permitirRoles('ADMON_GRAL', 'CAJERO'), async (req, res) => {
  const pagoId = Number(req.params.id);
  const motivo = String(req.body.motivo || '').trim();
  if (!idValido(pagoId)) return res.status(400).json({ error: 'Pago inválido' });
  if (!motivo) return res.status(400).json({ error: 'El motivo de cancelación es obligatorio' });
  if (motivo.length > 255) return res.status(400).json({ error: 'El motivo no puede exceder 255 caracteres' });
  let autorizacion;
  try {
    autorizacion = await resolverAutorizacionAdmin({
      usuario: req.usuario,
      body: req.body,
      buscarAdministrador: async username => {
        const [[administrador]] = await db.promise.query(
          `SELECT id,password_hash FROM usuarios
           WHERE username=? AND rol='ADMON_GRAL' AND activo=1 LIMIT 1`,
          [username]
        );
        return administrador;
      }
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'No fue posible validar la autorización'
    });
  }
  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    const [[pago]] = await connection.query(
      `SELECT id,cliente_id,monto_total,estado FROM pagos WHERE id=? FOR UPDATE`, [pagoId]
    );
    const [aplicaciones] = await connection.query(
      `SELECT ap.id,ap.cuenta_id,ap.monto_aplicado,
              cxc.cliente_id,cxc.venta_id,cxc.saldo_pendiente,cxc.total_deuda,cxc.estado cuenta_estado
       FROM aplicaciones_pago ap
       JOIN cuentas_por_cobrar cxc ON cxc.id=ap.cuenta_id
       WHERE ap.pago_id=? ORDER BY ap.id FOR UPDATE`, [pagoId]
    );
    const reversiones = prepararReversionPago(pago, aplicaciones);
    await connection.query(
      `UPDATE pagos SET estado='CANCELADO',cancelado_por=?,cancelado_at=NOW(),motivo_cancelacion=?
       WHERE id=?`, [autorizacion.autorizadoPor, motivo, pagoId]
    );
    for (const aplicacion of reversiones) {
      const saldoNuevo = aplicacion.saldo_nuevo;
      await connection.query(
        "UPDATE cuentas_por_cobrar SET saldo_pendiente=?,estado='PENDIENTE' WHERE id=?",
        [saldoNuevo, aplicacion.cuenta_id]
      );
      await connection.query("UPDATE ventas SET estado_pago='PENDIENTE' WHERE id=?", [aplicacion.venta_id]);
      const [[saldoCliente]] = await connection.query(
        "SELECT COALESCE(SUM(saldo_pendiente),0) total FROM cuentas_por_cobrar WHERE cliente_id=? AND estado='PENDIENTE'",
        [aplicacion.cliente_id]
      );
      await connection.query(
        `INSERT INTO movimientos_cartera
         (cliente_id,venta_id,cuenta_id,pago_id,fecha,concepto,folio,cargo,credito,saldo_resultante,descripcion,usuario_id)
         VALUES (?,?,?,NULL,NOW(),'CANCELACION_PAGO',?,?,0,?,?,?)`,
        [aplicacion.cliente_id, aplicacion.venta_id, aplicacion.cuenta_id,
          `CP-${pagoId}-${aplicacion.id}`, aplicacion.monto_aplicado,
          saldoCliente.total, `Cancelación del pago P-${pagoId}: ${motivo}`, autorizacion.solicitadoPor]
      );
    }
    const auditoriaRegistrada = await registrarAuditoriaSiExiste(connection, {
      accion: 'CANCELAR_PAGO',
      recursoTipo: 'PAGO',
      recursoId: pagoId,
      solicitadoPor: autorizacion.solicitadoPor,
      autorizadoPor: autorizacion.autorizadoPor,
      motivo
    });
    await connection.commit();
    res.json({
      mensaje: 'Pago cancelado',
      pago_id: pagoId,
      aplicaciones_revertidas: reversiones.length,
      auditoria_registrada: auditoriaRegistrada
    });
  } catch (e) {
    await connection.rollback();
    res.status(e.status || 500).json({ error: e.status ? e.message : 'No fue posible cancelar el pago' });
  } finally { connection.release(); }
});

router.get('/pagos/:id/recibo', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Pago inválido' });
  try {
    const [[pago]] = await db.promise.query(
      `SELECT p.id,p.fecha,p.monto_total,p.metodo_pago,p.referencia,p.observaciones,p.estado,
              c.id cliente_id,c.nombre_razon_social,u.nombre usuario
       FROM pagos p JOIN clientes c ON c.id=p.cliente_id JOIN usuarios u ON u.id=p.usuario_id WHERE p.id=?`, [Number(req.params.id)]
    );
    if (!pago) return res.status(404).json({ error: 'Pago no encontrado' });
    const [aplicaciones] = await db.promise.query(
      `SELECT ap.*,cxc.venta_id,CONCAT('V-',LPAD(cxc.venta_id,8,'0')) folio
       FROM aplicaciones_pago ap JOIN cuentas_por_cobrar cxc ON cxc.id=ap.cuenta_id WHERE ap.pago_id=? ORDER BY ap.id`, [pago.id]
    );
    const [formas_pago] = await db.promise.query(
      'SELECT metodo_pago,monto,referencia FROM pago_formas_pago WHERE pago_id=? ORDER BY id', [pago.id]
    );
    res.json({ pago, aplicaciones, formas_pago });
  } catch (e) { res.status(500).json({ error: 'No fue posible generar el recibo' }); }
});

module.exports = router;
