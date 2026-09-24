const crypto = require('crypto');

const PATRON_CLAVE = /^[A-Za-z0-9._:-]{8,80}$/;

function obtenerClave(req) {
  return String(req.get('Idempotency-Key') || req.body.idempotency_key || '').trim();
}

function validarClave(clave) {
  if (!PATRON_CLAVE.test(clave)) {
    throw Object.assign(new Error('Idempotency-Key es obligatorio y debe contener entre 8 y 80 caracteres seguros'), { status: 400 });
  }
  return clave;
}

function huella(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

module.exports = { obtenerClave, validarClave, huella };
