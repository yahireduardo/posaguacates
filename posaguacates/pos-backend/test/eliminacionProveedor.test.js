const test = require('node:test');
const assert = require('node:assert/strict');
const { validarConfirmacionProveedor, proveedorTieneCompras } = require('../lib/eliminacionProveedor');

test('eliminar proveedor exige confirmación exacta', () => {
  assert.equal(validarConfirmacionProveedor('ELIMINAR PROVEEDOR'), true);
  assert.equal(validarConfirmacionProveedor(' eliminar proveedor '), true);
  assert.equal(validarConfirmacionProveedor('eliminar'), false);
});

test('solo permite eliminar proveedores sin compras asociadas', () => {
  assert.equal(proveedorTieneCompras({ compras: 0 }), false);
  assert.equal(proveedorTieneCompras({ compras: 1 }), true);
  assert.equal(proveedorTieneCompras({ compras: '3' }), true);
});
