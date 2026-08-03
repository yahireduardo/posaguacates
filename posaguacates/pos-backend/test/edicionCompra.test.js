const test = require('node:test');
const assert = require('node:assert/strict');
const { cambiaImporteCompra, calcularStockEditado, totalCompraNoDisminuye } = require('../lib/edicionCompra');

const compra = { proveedor_id: 2, total: 500 };
const anteriores = [{ producto_id: 7, cantidad: 5, precio_compra: 100 }];
const nuevos = [{ producto: { id: 7 }, cantidad: 5, costo: 100 }];

test('editar solo datos de cabecera no altera importe ni inventario', () => {
  assert.equal(cambiaImporteCompra({ compra, proveedorId: 2, total: 500, anteriores, nuevos }), false);
});

test('detecta cambios de proveedor, cantidad o costo', () => {
  assert.equal(cambiaImporteCompra({ compra, proveedorId: 3, total: 500, anteriores, nuevos }), true);
  assert.equal(cambiaImporteCompra({ compra, proveedorId: 2, total: 600, anteriores,
    nuevos: [{ producto: { id: 7 }, cantidad: 6, costo: 100 }] }), true);
});

test('reconcilia stock y rechaza retirar mercancía ya consumida', () => {
  assert.equal(calcularStockEditado(12, 5, 8), 15);
  assert.equal(calcularStockEditado(3, 5, 1), null);
});

test('la edición nunca permite reducir el total original de la compra', () => {
  assert.equal(totalCompraNoDisminuye(500, 500), true);
  assert.equal(totalCompraNoDisminuye(500, 650), true);
  assert.equal(totalCompraNoDisminuye(500, 499.99), false);
});
