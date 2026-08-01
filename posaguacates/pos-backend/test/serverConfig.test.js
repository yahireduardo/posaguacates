const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET ||= 'test-only-secret';
const { EventEmitter } = require('node:events');
const { resolveListenHost, resolveCorsOrigins, crearLimitadorLogin } = require('../index');

test('el servidor usa loopback de forma predeterminada', () => {
  assert.equal(resolveListenHost(), '127.0.0.1');
});

test('el servidor permite una vinculación explícita para la red local', () => {
  assert.equal(resolveListenHost('0.0.0.0'), '0.0.0.0');
});

test('el servidor rechaza valores HOST que no son direcciones', () => {
  assert.throws(() => resolveListenHost('host; comando'), /HOST inválido/);
});

test('CORS permite automáticamente el mismo puerto local del servidor', () => {
  const origins = resolveCorsOrigins('https://pos.ejemplo.test', 3001);
  assert.deepEqual(origins, [
    'https://pos.ejemplo.test',
    'http://127.0.0.1:3001',
    'http://localhost:3001'
  ]);
});

function respuestaLogin() {
  const res = new EventEmitter();
  res.statusCode = 200;
  res.status = code => { res.statusCode = code; return res; };
  res.json = body => { res.body = body; res.emit('finish'); return res; };
  return res;
}

test('el limitador cuenta solo logins fallidos y se limpia al iniciar correctamente', () => {
  let reloj = 1000;
  const limitar = crearLimitadorLogin({ maxIntentos: 2, ventanaMs: 10000, now: () => reloj++ });
  const req = { method: 'POST', ip: '127.0.0.1' };
  for (const status of [401, 200, 401, 401]) {
    const res = respuestaLogin();
    limitar(req, res, () => { res.statusCode = status; res.emit('finish'); });
    assert.equal(res.statusCode, status);
  }
  const bloqueada = respuestaLogin();
  limitar(req, bloqueada, () => assert.fail('debe bloquear después de dos fallos consecutivos'));
  assert.equal(bloqueada.statusCode, 429);
});
