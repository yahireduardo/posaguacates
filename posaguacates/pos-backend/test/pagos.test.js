const test = require('node:test');
const assert = require('node:assert/strict');
const { prepararReversionPago } = require('../lib/pagos');

const aplicacion = (cambios = {}) => ({
  cuenta_id: 1,
  venta_id: 10,
  monto_aplicado: 200,
  saldo_pendiente: 50,
  total_deuda: 500,
  cuenta_estado: 'PENDIENTE',
  ...cambios
});

test('rechaza un pago inexistente', () => {
  assert.throws(() => prepararReversionPago(null, [aplicacion()]), { status: 404 });
});

test('evita cancelar dos veces el mismo pago', () => {
  assert.throws(
    () => prepararReversionPago({ estado: 'CANCELADO' }, [aplicacion()]),
    { status: 409, message: 'El pago ya está cancelado' }
  );
});

test('restaura el saldo de una aplicación sin superar la deuda', () => {
  const [resultado] = prepararReversionPago({ estado: 'ACTIVO' }, [aplicacion()]);
  assert.equal(resultado.saldo_nuevo, 250);
});

test('prepara atómicamente todas las aplicaciones de un pago', () => {
  const resultados = prepararReversionPago(
    { estado: 'ACTIVO' },
    [aplicacion(), aplicacion({ cuenta_id: 2, saldo_pendiente: 0, monto_aplicado: 300 })]
  );
  assert.deepEqual(resultados.map(r => r.saldo_nuevo), [250, 300]);
});

test('rechaza pagos ligados a una cuenta cancelada', () => {
  assert.throws(
    () => prepararReversionPago(
      { estado: 'ACTIVO' },
      [aplicacion({ cuenta_estado: 'CANCELADA' })]
    ),
    { status: 409 }
  );
});
