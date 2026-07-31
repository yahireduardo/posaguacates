const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();
const db = require('../db/conexion');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'sql', 'migrations');

function splitStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map(statement => statement.trim())
    .filter(Boolean);
}

async function preflight(connection) {
  const name = String(process.env.DB_NAME || '');
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error('DB_NAME inválido');
  const [[database]] = await connection.query('SELECT DATABASE() nombre');
  if (database.nombre !== name) throw new Error('La conexión no corresponde a DB_NAME');
  const [tables] = await connection.query(
    `SELECT TABLE_NAME nombre, ENGINE motor FROM information_schema.TABLES
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('usuarios','productos','clientes','ventas')`
  );
  if (tables.length !== 4) throw new Error('Faltan tablas base; no se aplicaron migraciones');
  if (tables.some(table => table.motor !== 'InnoDB')) throw new Error('Las tablas base deben usar InnoDB');
}

async function migrate() {
  const connection = await db.promise.getConnection();
  try {
    await preflight(connection);
    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(100) NOT NULL PRIMARY KEY, description VARCHAR(255) NOT NULL,
      checksum_sha256 CHAR(64) NOT NULL, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    const files = (await fs.readdir(MIGRATIONS_DIR)).filter(name => /^\d+.*\.sql$/.test(name)).sort();
    for (const file of files) {
      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const [existing] = await connection.query(
        'SELECT checksum_sha256 FROM schema_migrations WHERE version=?', [file]
      );
      if (existing.length) {
        if (existing[0].checksum_sha256 !== checksum) throw new Error(`La migración aplicada fue modificada: ${file}`);
        console.log(`Migración ya aplicada: ${file}`);
        continue;
      }
      for (const statement of splitStatements(sql)) await connection.query(statement);
      await connection.query(
        'INSERT INTO schema_migrations (version,description,checksum_sha256) VALUES (?,?,?)',
        [file, 'Reconciliación funcional aditiva', checksum]
      );
      console.log(`Migración aplicada: ${file}`);
    }
  } finally {
    connection.release();
    await db.promise.end();
  }
}

if (require.main === module) migrate().catch(error => {
  console.error(`Migración cancelada: ${error.message}`);
  process.exitCode = 1;
});

module.exports = { splitStatements, preflight, migrate };

