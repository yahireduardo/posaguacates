const test = require('node:test');
const assert = require('node:assert/strict');
const { sourceKey } = require('../scripts/importHistoricalDemand');

test('la clave histórica es estable y distingue hojas', () => {
  const record = { file: 'inventario.xlsx', sheet: 'HASS 01 ENE', date: '2025-01-03' };
  assert.equal(sourceKey(record), sourceKey({ ...record }));
  assert.notEqual(sourceKey(record), sourceKey({ ...record, sheet: 'HASS 02 ENE' }));
});
