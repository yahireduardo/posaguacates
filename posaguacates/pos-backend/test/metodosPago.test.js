const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizarMetodosPago } = require('../lib/metodosPago');

test('acepta efectivo y transferencia que completan el total', () => {
  const r = normalizarMetodosPago({ metodos_pago: [
    { metodo_pago: 'EFECTIVO', monto: 40 },
    { metodo_pago: 'TRANSFERENCIA', monto: 60, referencia: 'ABC' }
  ] }, 100);
  assert.equal(r.metodo_resumen, 'MIXTO');
  assert.equal(r.metodos.length, 2);
});

test('rechaza una distribución que no coincide con el total', () => {
  assert.throws(() => normalizarMetodosPago({ metodos_pago: [{ metodo_pago: 'EFECTIVO', monto: 90 }] }, 100), /coincidir/);
});

test('exige referencia para transferencia y cheque', () => {
  assert.throws(() => normalizarMetodosPago({ metodos_pago: [{ metodo_pago: 'CHEQUE', monto: 100 }] }, 100), /referencia/);
});

test('calcula cambio cuando el efectivo recibido supera el total', () => {
  const r = normalizarMetodosPago({ metodos_pago: [
    { metodo_pago: 'EFECTIVO', monto: 600 }
  ] }, 100, { permitirCambio: true });
  assert.equal(r.importe_recibido, 600);
  assert.equal(r.cambio, 500);
});

test('no permite cambio sin efectivo', () => {
  assert.throws(() => normalizarMetodosPago({ metodos_pago: [
    { metodo_pago: 'TRANSFERENCIA', monto: 110, referencia: 'ABC' }
  ] }, 100, { permitirCambio: true }), /Solo el efectivo/);
});
