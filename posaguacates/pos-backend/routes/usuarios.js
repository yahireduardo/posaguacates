const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/conexion');
const { permitirRoles } = require('../middleware/auth');

const router = express.Router();
router.use(permitirRoles('ADMON_GRAL'));

const usernameValido = value => /^[a-zA-Z0-9._-]{3,50}$/.test(value);
const passwordValido = value => typeof value === 'string' && value.length >= 8 && value.length <= 128;
const fallo = (mensaje, status) => Object.assign(new Error(mensaje), { status });

async function auditar(connection, usuarioId, accion, entidadId, motivo, datos = null) {
  await connection.query(
    `INSERT INTO auditoria_operaciones (usuario_id,accion,entidad,entidad_id,motivo,datos_json)
     VALUES (?,?, 'USUARIO',?,?,?)`,
    [usuarioId, accion, String(entidadId), motivo || null, datos ? JSON.stringify(datos) : null]
  );
}

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.promise.query(
      `SELECT id,nombre,username,rol,activo,creado_en,actualizado_en
       FROM usuarios ORDER BY activo DESC,nombre,username`
    );
    res.json(rows);
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  const nombre = String(req.body.nombre || '').trim();
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const rol = String(req.body.rol || 'CAJERO');
  if (!nombre || !usernameValido(username) || !passwordValido(password) || !['ADMON_GRAL', 'CAJERO'].includes(rol)) {
    return res.status(400).json({ error: 'Nombre, username, contraseña (mínimo 8 caracteres) y rol válidos son obligatorios' });
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.promise.query(
      'INSERT INTO usuarios (nombre,username,password_hash,password,rol,activo) VALUES (?,?,?,NULL,?,1)',
      [nombre, username, hash, rol]
    );
    await auditar(db.promise, req.usuario.id, 'CREAR_USUARIO', result.insertId, null, { username, rol });
    res.status(201).json({ id: result.insertId, mensaje: 'Usuario creado' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El username ya existe' });
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  const nombre = String(req.body.nombre || '').trim();
  const username = String(req.body.username || '').trim();
  const rol = String(req.body.rol || '');
  if (!Number.isInteger(id) || id <= 0 || !nombre || !usernameValido(username) || !['ADMON_GRAL', 'CAJERO'].includes(rol)) {
    return res.status(400).json({ error: 'Datos de usuario inválidos' });
  }
  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    const [[actual]] = await connection.query('SELECT id,rol,activo FROM usuarios WHERE id=? FOR UPDATE', [id]);
    if (!actual) throw fallo('Usuario no encontrado', 404);
    if (actual.rol === 'ADMON_GRAL' && actual.activo && rol !== 'ADMON_GRAL') {
      const [[admins]] = await connection.query("SELECT COUNT(*) total FROM usuarios WHERE rol='ADMON_GRAL' AND activo=1 FOR UPDATE");
      if (Number(admins.total) <= 1) throw fallo('No se puede quitar el rol al último administrador activo', 409);
    }
    await connection.query('UPDATE usuarios SET nombre=?,username=?,rol=? WHERE id=?', [nombre, username, rol, id]);
    await auditar(connection, req.usuario.id, 'EDITAR_USUARIO', id, null, { username, rol });
    await connection.commit();
    res.json({ mensaje: 'Usuario actualizado' });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El username ya existe' });
    next(error);
  } finally { connection.release(); }
});

router.patch('/:id/estado', async (req, res, next) => {
  const id = Number(req.params.id);
  const activo = req.body.activo === true || req.body.activo === 1;
  const motivo = String(req.body.motivo || '').trim();
  if (!Number.isInteger(id) || id <= 0 || (!activo && !motivo)) return res.status(400).json({ error: 'Usuario y motivo válidos son obligatorios' });
  if (id === Number(req.usuario.id) && !activo) return res.status(409).json({ error: 'No puedes desactivar tu propia sesión' });
  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    const [[actual]] = await connection.query('SELECT rol,activo FROM usuarios WHERE id=? FOR UPDATE', [id]);
    if (!actual) throw fallo('Usuario no encontrado', 404);
    if (!activo && actual.rol === 'ADMON_GRAL' && actual.activo) {
      const [[admins]] = await connection.query("SELECT COUNT(*) total FROM usuarios WHERE rol='ADMON_GRAL' AND activo=1 FOR UPDATE");
      if (Number(admins.total) <= 1) throw fallo('No se puede desactivar al último administrador activo', 409);
    }
    await connection.query('UPDATE usuarios SET activo=? WHERE id=?', [activo ? 1 : 0, id]);
    await auditar(connection, req.usuario.id, activo ? 'ACTIVAR_USUARIO' : 'DESACTIVAR_USUARIO', id, motivo);
    await connection.commit();
    res.json({ mensaje: activo ? 'Usuario activado' : 'Usuario desactivado' });
  } catch (error) { await connection.rollback(); next(error); }
  finally { connection.release(); }
});

router.put('/:id/password', async (req, res, next) => {
  const id = Number(req.params.id);
  const password = String(req.body.password || '');
  if (!Number.isInteger(id) || id <= 0 || !passwordValido(password)) return res.status(400).json({ error: 'La contraseña debe tener entre 8 y 128 caracteres' });
  try {
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.promise.query('UPDATE usuarios SET password_hash=?,password=NULL WHERE id=?', [hash, id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Usuario no encontrado' });
    await auditar(db.promise, req.usuario.id, 'CAMBIAR_PASSWORD', id, 'Cambio administrativo');
    res.json({ mensaje: 'Contraseña actualizada' });
  } catch (error) { next(error); }
});

module.exports = router;
