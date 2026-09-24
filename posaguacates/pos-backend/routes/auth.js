const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/conexion');
const { autenticar, validarSesion, jwtSecret } = require('../middleware/auth');
const { LoginRateLimitService } = require('../services/loginRateLimitService');

const router = express.Router();
const limitador = new LoginRateLimitService({ db: db.promise });

router.post('/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (!username || !password) {
    return res.status(400).json({ error: 'Username y contraseña son obligatorios' });
  }

  try {
    const estadoLimite = await limitador.estado(req.ip, username);
    if (estadoLimite.bloqueado) {
      res.set('Retry-After', String(Math.max(1, Math.ceil(estadoLimite.reintentarEnMs / 1000))));
      return res.status(429).json({ error: 'Demasiados intentos para este usuario desde este equipo. Intenta más tarde' });
    }
    const [usuarios] = await db.promise.query(
      `SELECT id, username, nombre, password_hash, rol
       FROM usuarios
       WHERE username = ? AND activo = 1
       LIMIT 1`,
      [username]
    );

    if (!usuarios.length) {
      await limitador.registrarFallo(req.ip, username);
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const usuario = usuarios[0];
    if (!['ADMON_GRAL', 'CAJERO'].includes(usuario.rol)) {
      return res.status(403).json({ error: 'El rol del usuario no está autorizado' });
    }

    const passwordValido = usuario.password_hash
      && await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValido) {
      await limitador.registrarFallo(req.ip, username);
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    await limitador.limpiar(req.ip, username);
    const sid = crypto.randomUUID();
    const payload = {
      id: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
      sid
    };
    const token = jwt.sign(payload, jwtSecret(), {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    });
    const decoded = jwt.decode(token);
    await db.promise.query(
      'INSERT INTO sesiones_usuario(id,usuario_id,expira_at,ip,user_agent) VALUES(?,?,FROM_UNIXTIME(?),?,?)',
      [sid, usuario.id, decoded.exp, String(req.ip || '').slice(0, 45), String(req.get('User-Agent') || '').slice(0, 255)]
    );
    await db.promise.query('DELETE FROM sesiones_usuario WHERE expira_at<NOW()');

    return res.json({
      token,
      usuario: { ...payload, nombre: usuario.nombre }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'No fue posible iniciar sesión' });
  }
});

router.get('/me', autenticar, validarSesion, (req, res) => res.json({ usuario: req.usuario }));
router.post('/logout', autenticar, async (req, res, next) => {
  try {
    if (req.usuario.sid) await db.promise.query(
      'UPDATE sesiones_usuario SET revocada_at=COALESCE(revocada_at,NOW()) WHERE id=? AND usuario_id=?',
      [req.usuario.sid, req.usuario.id]
    );
    return res.json({ ok: true, mensaje: 'Sesión cerrada' });
  } catch (error) { return next(error); }
});

module.exports = router;
