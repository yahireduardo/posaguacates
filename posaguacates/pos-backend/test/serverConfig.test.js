const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET ||= 'test-only-secret';
const { resolveListenHost } = require('../index');

test('el servidor usa loopback de forma predeterminada', () => {
  assert.equal(resolveListenHost(), '127.0.0.1');
});

test('el servidor permite una vinculación explícita para la red local', () => {
  assert.equal(resolveListenHost('0.0.0.0'), '0.0.0.0');
});

test('el servidor rechaza valores HOST que no son direcciones', () => {
  assert.throws(() => resolveListenHost('host; comando'), /HOST inválido/);
});
