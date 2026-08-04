const test = require('node:test');
const assert = require('node:assert/strict');
const { validarConfirmacionProducto, motivoBloqueoProducto } = require('../lib/eliminacionProducto');

test('eliminar producto exige la confirmación exacta', () => {
  assert.equal(validarConfirmacionProducto('ELIMINAR PRODUCTO'), true);
  assert.equal(validarConfirmacionProducto(' eliminar producto '), true);
  assert.equal(validarConfirmacionProducto('eliminar'), false);
});

test('bloquea un producto con movimientos de inventario', () => {
  assert.match(motivoBloqueoProducto({ movimientos: 1, ventas: 0, compras: 0, ordenes: 0 }), /movimientos/);
});

test('bloquea historial comercial aun sin movimientos y permite un producto nuevo', () => {
  assert.match(motivoBloqueoProducto({ movimientos: 0, ventas: 0, compras: 1, ordenes: 0 }), /historial/);
  assert.equal(motivoBloqueoProducto({ movimientos: 0, ventas: 0, compras: 0, ordenes: 0 }), null);
});
