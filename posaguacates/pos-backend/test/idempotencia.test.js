const test = require('node:test');
const assert = require('node:assert/strict');
const { validarClave, huella } = require('../lib/idempotencia');

test('acepta UUID y rechaza claves débiles o con caracteres inseguros', () => {
  assert.equal(validarClave('550e8400-e29b-41d4-a716-446655440000'), '550e8400-e29b-41d4-a716-446655440000');
  assert.throws(() => validarClave('corta'), /obligatorio/);
  assert.throws(() => validarClave('clave con espacios'), /obligatorio/);
});

test('la huella es estable y cambia cuando cambia el pago', () => {
  const base = { cuentaId: 2, monto: 100, metodo: 'EFECTIVO' };
  assert.equal(huella(base), huella({ cuentaId: 2, monto: 100, metodo: 'EFECTIVO' }));
  assert.notEqual(huella(base), huella({ ...base, monto: 101 }));
});
