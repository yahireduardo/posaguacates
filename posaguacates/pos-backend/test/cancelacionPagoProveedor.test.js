const test = require('node:test');
const assert = require('node:assert/strict');
const { prepararCancelacionPagoProveedor } = require('../lib/cancelacionPagoProveedor');

test('eliminar un pago restaura el saldo de la compra', () => {
  assert.deepEqual(
    prepararCancelacionPagoProveedor(
      { estado: 'ACTIVO', monto: 300 },
      { estado: 'PENDIENTE', total_deuda: 1000, saldo_pendiente: 400 }
    ),
    { saldo_nuevo: 700, estado_cuenta: 'PENDIENTE' }
  );
});

test('impide eliminar dos veces o exceder la deuda original', () => {
  assert.equal(prepararCancelacionPagoProveedor({ estado: 'CANCELADO', monto: 100 }, { estado: 'PENDIENTE' }).status, 409);
  assert.equal(prepararCancelacionPagoProveedor(
    { estado: 'ACTIVO', monto: 300 }, { estado: 'PENDIENTE', total_deuda: 1000, saldo_pendiente: 800 }
  ).status, 409);
});
