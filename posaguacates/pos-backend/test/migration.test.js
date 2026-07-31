const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { splitStatements, preflight } = require('../scripts/migrate');

test('la migración funcional es aditiva y no contiene operaciones destructivas', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'migrations', '001_reconciliacion_funcional.sql'), 'utf8');
  assert.doesNotMatch(sql, /\b(?:DROP|TRUNCATE|DELETE)\b/i);
  assert.ok(splitStatements(sql).length > 10);
});

test('preflight rechaza una conexión a una base distinta', async () => {
  const previous = process.env.DB_NAME;
  process.env.DB_NAME = 'posaguacates';
  const connection = { query: async () => [[{ nombre: 'otra_base' }]] };
  await assert.rejects(preflight(connection), /no corresponde/);
  process.env.DB_NAME = previous;
});

test('preflight exige las tablas base e InnoDB', async () => {
  const previous = process.env.DB_NAME;
  process.env.DB_NAME = 'posaguacates';
  let call = 0;
  const connection = { query: async () => ++call === 1
    ? [[{ nombre: 'posaguacates' }]]
    : [[{ nombre: 'usuarios', motor: 'InnoDB' }]] };
  await assert.rejects(preflight(connection), /Faltan tablas base/);
  process.env.DB_NAME = previous;
});
