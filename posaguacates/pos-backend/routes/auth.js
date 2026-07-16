const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/conexion');
const { jwtSecret } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (!username || !password) {
    return res.status(400).json({ error: 'Username y contraseña son obligatorios' });
  }

  try {
    const [usuarios] = await db.promise.query(
      `SELECT id, username, nombre, password, password_hash, rol
       FROM usuarios
       WHERE username = ? AND activo = 1
       LIMIT 1`,
      [username]
    );

    if (!usuarios.length) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const usuario = usuarios[0];
    let passwordValido = false;

    if (usuario.password_hash) {
      passwordValido = await bcrypt.compare(password, usuario.password_hash);
    } else if (usuario.password && password === usuario.password) {
      // Migración segura en el primer login de cuentas heredadas.
      const hash = await bcrypt.hash(password, 12);
      await db.promise.query(
        'UPDATE usuarios SET password_hash = ?, password = NULL WHERE id = ?',
        [hash, usuario.id]
      );
      passwordValido = true;
    }

    if (!passwordValido) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const payload = {
      id: usuario.id,
      username: usuario.username,
      rol: usuario.rol
    };
    const token = jwt.sign(payload, jwtSecret(), {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    });

    return res.json({
      token,
      usuario: { ...payload, nombre: usuario.nombre }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'No fue posible iniciar sesión' });
  }
});

module.exports = router;
