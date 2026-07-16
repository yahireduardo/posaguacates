const jwt = require('jsonwebtoken');

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

module.exports = { autenticar, permitirRoles, jwtSecret };
