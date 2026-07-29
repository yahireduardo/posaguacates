const express = require('express');
const db = require('../db/conexion');
const { permitirRoles } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  const buscar = String(req.query.buscar || '').trim();
  const pagina = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1);
  const limite = Math.min(500, Math.max(1, Number.parseInt(req.query.limite, 10) || 200));
  const params = [];
  let where = 'activo = 1';
  if (buscar) {
    where += ' AND (nombre_razon_social LIKE ? OR rfc LIKE ? OR telefono LIKE ?)';
    params.push(`%${buscar}%`, `%${buscar}%`, `%${buscar}%`);
  }
  try {
    const [rows] = await db.promise.query(
      `SELECT id, nombre_razon_social, rfc, telefono, correo_electronico
       FROM clientes WHERE ${where}
       ORDER BY nombre_razon_social COLLATE utf8mb4_spanish_ci, id LIMIT ? OFFSET ?`,
      [...params, limite, (pagina - 1) * limite]
    );
    const [[total]] = await db.promise.query(`SELECT COUNT(*) total FROM clientes WHERE ${where}`, params);
    res.json(req.query.pagina || req.query.buscar ? { datos: rows, pagina, limite, total: total.total } : rows);
  } catch (error) { res.status(500).json({ error: 'No fue posible consultar clientes' }); }
});

router.get('/:id/resumen', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Cliente inválido' });
  try {
    const [[cliente], [cuentas], [movimientos], [ordenes], [ventas]] = await Promise.all([
      db.promise.query(`SELECT id,nombre_razon_social,rfc,telefono,correo_electronico,activo FROM clientes WHERE id=?`, [id]),
      db.promise.query(`SELECT id,venta_id,total_deuda,saldo_pendiente,estado,fecha
        FROM cuentas_por_cobrar WHERE cliente_id=? ORDER BY fecha,id`, [id]),
      db.promise.query(`SELECT mc.*,u.nombre usuario FROM movimientos_cartera mc
        LEFT JOIN usuarios u ON u.id=mc.usuario_id WHERE mc.cliente_id=? ORDER BY mc.fecha,mc.id`, [id]),
      db.promise.query(`SELECT id,folio,estado,total_estimado,creada_at FROM ordenes_venta
        WHERE cliente_id=? AND estado='PENDIENTE' ORDER BY creada_at,id`, [id]),
      db.promise.query(`SELECT id,total,tipo_pago,estado_pago,estado_venta,fecha FROM ventas
        WHERE cliente_id=? ORDER BY fecha DESC,id DESC LIMIT 20`, [id])
    ]);
    if (!cliente[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ cliente: cliente[0],
      saldo_total: cuentas.filter(c => c.estado === 'PENDIENTE').reduce((s, c) => s + Number(c.saldo_pendiente), 0),
      cuentas, movimientos, ordenes, ventas });
  } catch (error) {
    res.status(500).json({ error: 'No fue posible consultar el estado de cuenta; verifica la migración pendiente' });
  }
});

function datosCliente(body) {
  return {
    nombre: String(body.nombre_razon_social || '').trim(),
    rfc: String(body.rfc || '').trim().toUpperCase() || null,
    telefono: String(body.telefono || '').trim() || null,
    correo: String(body.correo_electronico || '').trim().toLowerCase() || null
  };
}

async function crearCliente(req, res) {
  const c = datosCliente(req.body);
  if (!c.nombre) return res.status(400).json({ error: 'Nombre o razón social obligatorio' });
  try {
    const [result] = await db.promise.query(
      `INSERT INTO clientes (nombre_razon_social, rfc, telefono, correo_electronico)
       VALUES (?, ?, ?, ?)`, [c.nombre, c.rfc, c.telefono, c.correo]
    );
    res.status(201).json({ mensaje: 'Cliente creado', cliente_id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El RFC ya está registrado' });
    res.status(500).json({ error: 'No fue posible crear el cliente' });
  }
}

router.post('/', crearCliente);
router.post('/crear', crearCliente); // Compatibilidad temporal con el frontend anterior.

router.put('/:id', permitirRoles('ADMON_GRAL'), async (req, res) => {
  const id = Number(req.params.id);
  const c = datosCliente(req.body);
  if (!Number.isInteger(id) || id <= 0 || !c.nombre) return res.status(400).json({ error: 'Datos inválidos' });
  try {
    const [result] = await db.promise.query(
      `UPDATE clientes SET nombre_razon_social = ?, rfc = ?, telefono = ?, correo_electronico = ?
       WHERE id = ? AND activo = 1`, [c.nombre, c.rfc, c.telefono, c.correo, id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ mensaje: 'Cliente actualizado' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El RFC ya está registrado' });
    res.status(500).json({ error: 'No fue posible actualizar el cliente' });
  }
});

module.exports = router;
