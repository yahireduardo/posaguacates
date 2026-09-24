const jwt = require('jsonwebtoken');
const db = require('../db/conexion');

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está configurado');
  }
  return secret;
}

function autenticar(req, res, next) {
  const authorization = req.get('Authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token JWT requerido' });
  }

  try {
    req.usuario = jwt.verify(token, jwtSecret(), {
      algorithms: ['HS256']
    });
    return next();
  } catch (error) {
    return res.status(401).json({
      error: error.name === 'TokenExpiredError'
        ? 'La sesión expiró'
        : 'Token JWT inválido'
    });
  }
}

function permitirRoles(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esta operación' });
    }
    return next();
  };
}

async function validarSesion(req, res, next) {
  try {
    if (!req.usuario?.sid) return res.status(401).json({ error: 'La sesión ya no está activa' });
    const [rows] = await db.promise.query(
      `SELECT u.id,u.username,u.nombre,u.rol,u.activo,s.revocada_at,s.expira_at
       FROM usuarios u JOIN sesiones_usuario s ON s.usuario_id=u.id
       WHERE u.id=? AND s.id=? LIMIT 1`,
      [req.usuario.id, req.usuario.sid]
    );
    const usuario = rows[0];
    if (!usuario || !Number(usuario.activo) || usuario.revocada_at || new Date(usuario.expira_at).getTime() <= Date.now()) {
      return res.status(401).json({ error: 'La sesión ya no está activa' });
    }
    if (!['ADMON_GRAL', 'CAJERO'].includes(usuario.rol)) {
      return res.status(403).json({ error: 'El rol actual no está autorizado' });
    }
    req.usuario = { id: usuario.id, username: usuario.username, nombre: usuario.nombre, rol: usuario.rol };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { autenticar, validarSesion, permitirRoles, jwtSecret };
