const test = require('node:test');
const assert = require('node:assert/strict');
const { csvValue } = require('../routes/reportes');

test('CSV neutraliza fórmulas y conserva el escape de comillas', () => {
  assert.equal(csvValue('=2+2'), '"\'=2+2"');
  assert.equal(csvValue('@SUMA(A1:A2)'), '"\'@SUMA(A1:A2)"');
  assert.equal(csvValue('Proveedor "Hass"'), '"Proveedor ""Hass"""');
});
