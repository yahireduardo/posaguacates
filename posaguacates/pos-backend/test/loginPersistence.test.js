const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizarIp, normalizarUsuario } = require('../services/loginRateLimitService');

test('el limitador separa IPv4 normalizada y usuario sin distinguir mayúsculas', () => {
  assert.equal(normalizarIp('::ffff:192.168.1.20'), '192.168.1.20');
  assert.equal(normalizarUsuario('  ADMIN  '), 'admin');
});

test('las claves del limitador están acotadas para no crecer sin límite', () => {
  assert.equal(normalizarIp('x'.repeat(100)).length, 45);
  assert.equal(normalizarUsuario('U'.repeat(100)).length, 50);
});
