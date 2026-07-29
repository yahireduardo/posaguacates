const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { esCantidadValida, mensajeCantidad } = require('../lib/cantidades');
const { passwordAdminValida } = require('../lib/cancelacion');

test('cajas aceptan enteros y medias cajas', () => {
  for (const valor of [0.5, 1, 1.5, 2, 10.5]) assert.equal(esCantidadValida(valor, 'CAJA'), true);
});

test('cajas rechazan otros decimales, cero y negativos', () => {
  for (const valor of [0, -1, 0.3, 1.2, 1.25, 1.75, 2.3, NaN]) assert.equal(esCantidadValida(valor, 'CAJA'), false);
  assert.match(mensajeCantidad('CAJA'), /enteras o medias cajas/);
});

test('kilos aceptan cualquier decimal positivo válido', () => {
  for (const valor of [1, 1.25, 2.3, 10.75]) assert.equal(esCantidadValida(valor, 'kg'), true);
  for (const valor of [0, -1, NaN]) assert.equal(esCantidadValida(valor, 'kg'), false);
});

test('reautenticación acepta contraseña administrativa correcta', async () => {
  const hash = await bcrypt.hash('correcta', 4);
  assert.equal(await passwordAdminValida('correcta', hash), true);
});

test('reautenticación rechaza contraseña administrativa incorrecta', async () => {
  const hash = await bcrypt.hash('correcta', 4);
  assert.equal(await passwordAdminValida('incorrecta', hash), false);
});
