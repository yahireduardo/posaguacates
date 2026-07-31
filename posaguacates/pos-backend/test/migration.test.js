const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { splitStatements, migrationChecksum, preflight } = require('../scripts/migrate');

test('todas las migraciones son aditivas y no contienen operaciones destructivas', () => {
  const directory = path.join(__dirname, '..', 'sql', 'migrations');
  const files = fs.readdirSync(directory).filter(file => /^\d+.*\.sql$/.test(file));
  assert.ok(files.length >= 2);
  for (const file of files) {
    const sql = fs.readFileSync(path.join(directory, file), 'utf8');
    assert.doesNotMatch(sql, /\b(?:DROP|TRUNCATE|DELETE)\b/i, file);
    assert.ok(splitStatements(sql).length > 0, file);
  }
});

test('el checksum de migración es estable entre LF y CRLF', () => {
  const lf = 'CREATE TABLE ejemplo (id INT);\nINSERT INTO ejemplo VALUES (1);\n';
  const crlf = lf.replace(/\n/g, '\r\n');
  assert.equal(migrationChecksum(lf), migrationChecksum(crlf));
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
