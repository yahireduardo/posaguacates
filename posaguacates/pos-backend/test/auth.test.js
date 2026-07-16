const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { autenticar, permitirRoles } = require('../middleware/auth');

process.env.JWT_SECRET = 'secreto-exclusivo-para-pruebas';

function respuesta() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('rechaza una solicitud sin token', () => {
  const res = respuesta();
  autenticar({ get: () => '' }, res, () => assert.fail('no debe continuar'));
  assert.equal(res.statusCode, 401);
});

test('rechaza un token inválido', () => {
  const res = respuesta();
  autenticar({ get: () => 'Bearer no-es-jwt' }, res, () => assert.fail('no debe continuar'));
  assert.equal(res.statusCode, 401);
});

test('rechaza un token expirado', () => {
  const token = jwt.sign({ id: 1, rol: 'CAJERO' }, process.env.JWT_SECRET, { expiresIn: -1 });
  const res = respuesta();
  autenticar({ get: () => `Bearer ${token}` }, res, () => assert.fail('no debe continuar'));
  assert.equal(res.statusCode, 401);
  assert.match(res.body.error, /expiró/);
});

test('acepta un token válido', () => {
  const token = jwt.sign({ id: 1, rol: 'ADMON_GRAL' }, process.env.JWT_SECRET, { expiresIn: '1m' });
  const req = { get: () => `Bearer ${token}` };
  autenticar(req, respuesta(), () => assert.equal(req.usuario.id, 1));
});

test('impide al cajero acceder a una operación administrativa', () => {
  const res = respuesta();
  permitirRoles('ADMON_GRAL')({ usuario: { rol: 'CAJERO' } }, res, () => assert.fail('no debe continuar'));
  assert.equal(res.statusCode, 403);
});
