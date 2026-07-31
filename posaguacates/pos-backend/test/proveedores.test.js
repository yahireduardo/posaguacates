const test = require('node:test');
const assert = require('node:assert/strict');
const { datosProveedor, validarProveedor } = require('../lib/proveedores');

test('normaliza los datos de proveedor y elimina espacios repetidos', () => {
  const p = datosProveedor({
    nombre: '  Comercial   del Sur ', razon_social: ' Empresa   Demo ',
    correo: ' VENTAS@EJEMPLO.COM ', rfc: ' abc010101ab1 '
  });
  assert.equal(p.nombre, 'Comercial del Sur');
  assert.equal(p.razon_social, 'Empresa Demo');
  assert.equal(p.correo, 'ventas@ejemplo.com');
  assert.equal(p.rfc, 'ABC010101AB1');
  assert.equal(validarProveedor(p), null);
});

test('rechaza nombre vacío, teléfono, correo y RFC inválidos', () => {
  assert.match(validarProveedor(datosProveedor({ nombre: '   ' })), /nombre/i);
  assert.match(validarProveedor(datosProveedor({ nombre: 'Proveedor', telefono: 'abc' })), /teléfono/i);
  assert.match(validarProveedor(datosProveedor({ nombre: 'Proveedor', correo: 'correo@' })), /correo/i);
  assert.match(validarProveedor(datosProveedor({ nombre: 'Proveedor', rfc: 'INVALIDO' })), /RFC/);
});

test('acepta campos opcionales vacíos como NULL', () => {
  const p = datosProveedor({ nombre: 'Proveedor' });
  assert.equal(p.contacto, null);
  assert.equal(p.telefono, null);
  assert.equal(p.correo, null);
  assert.equal(p.rfc, null);
});
