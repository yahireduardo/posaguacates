const express = require('express');
const db = require('../db/conexion');
const { permitirRoles } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.promise.query(
      `SELECT id, nombre_razon_social, rfc, telefono, correo_electronico
       FROM clientes WHERE activo = 1 ORDER BY nombre_razon_social`
    );
    res.json(rows);
  } catch (error) { res.status(500).json({ error: 'No fue posible consultar clientes' }); }
});

function datosCliente(body) {
  return {
    nombre: String(body.nombre_razon_social || '').trim(),
    rfc: String(body.rfc || '').trim().toUpperCase() || null,
    telefono: String(body.telefono || '').trim() || null,
    correo: String(body.correo_electronico || '').trim().toLowerCase() || null
  };
}

router.post('/crear', async (req, res) => {
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
});

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
