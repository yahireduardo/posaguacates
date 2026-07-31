const test = require('node:test');
const assert = require('node:assert/strict');
const { construirAplicaciones } = require('../lib/cartera');

const cuentas = [
  { id: 1, saldo_pendiente: 100, fecha: '2026-01-01' },
  { id: 2, saldo_pendiente: 80, fecha: '2026-02-01' }
];

test('aplicación automática paga primero la nota más antigua', () => {
  const r = construirAplicaciones(cuentas, { cuenta_ids: [1, 2], modo: 'AUTOMATICO' }, 130);
  assert.deepEqual(r.map(x => [x.cuenta.id, x.monto]), [[1, 100], [2, 30]]);
});

test('aplicación automática permite pago parcial', () => {
  const r = construirAplicaciones(cuentas, { cuenta_ids: [1], modo: 'AUTOMATICO' }, 40);
  assert.equal(r[0].monto, 40);
});

test('aplicación manual exige que la distribución cuadre', () => {
  assert.throws(() => construirAplicaciones(cuentas, {
    cuenta_ids: [1, 2], modo: 'MANUAL',
    aplicaciones: [{ cuenta_id: 1, monto: 50 }, { cuenta_id: 2, monto: 20 }]
  }, 80), /suma aplicada/);
});

test('rechaza pago superior a los saldos elegidos', () => {
  assert.throws(() => construirAplicaciones(cuentas, { cuenta_ids: [1, 2] }, 181), /supera/);
});

test('rechaza aplicación manual mayor al saldo de una nota', () => {
  assert.throws(() => construirAplicaciones(cuentas, {
    cuenta_ids: [1], modo: 'MANUAL', aplicaciones: [{ cuenta_id: 1, monto: 101 }]
  }, 101), /supera|inválida/);
});
