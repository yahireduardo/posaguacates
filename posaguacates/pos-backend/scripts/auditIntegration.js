const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const mysql = require('mysql2/promise');
const { crearCredencialesTemporales, eliminarCredencialesTemporales } = require('../utils/tempCredentials');

require('dotenv').config({ path: process.env.SOURCE_ENV_PATH || '.env', quiet: true });
const database = String(process.env.AUDIT_TEST_DATABASE || 'posaguacates_test');
if (!/^(?:posaguacates_test|test_[A-Za-z0-9_]+)$/.test(database)) throw new Error('Nombre de BD de auditoría inseguro');

function ejecutar(programa, argumentos, opciones) {
  const result = spawnSync(programa, argumentos, { ...opciones, stdio: opciones?.input ? ['pipe', 'inherit', 'inherit'] : 'inherit' });
  if (result.status !== 0) throw new Error(`${path.basename(programa)} terminó con código ${result.status}`);
}

(async () => {
  let credentials;
  const connectionConfig = { host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD };
  try {
    const admin = await mysql.createConnection(connectionConfig);
    await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await admin.end();
    credentials = await crearCredencialesTemporales(connectionConfig);
    const maria = path.join(process.env.MARIADB_BIN_DIR || 'C:/Program Files/MariaDB 12.3/bin', 'mariadb.exe');
    ejecutar(maria, [`--defaults-extra-file=${credentials.ruta}`, '--ssl=0', database],
      { input: fs.readFileSync(path.join(__dirname, '..', 'sql', 'posaguacates.sql')) });
    const env = { ...process.env, NODE_ENV: 'test', TEST_DATABASE: 'true', DB_NAME: database,
      JWT_SECRET: 'audit-test-jwt-secret-with-at-least-32-characters',
      BACKUP_SIGNING_KEY: 'audit-test-backup-signing-key-with-at-least-32-characters' };
    ejecutar(process.execPath, ['scripts/migrate.js'], { cwd: path.join(__dirname, '..'), env });
    ejecutar(process.execPath, ['scripts/testIntegration.js'], { cwd: path.join(__dirname, '..'), env });
    ejecutar(process.execPath, ['scripts/checkIntegrity.js'], { cwd: path.join(__dirname, '..'), env });
    console.log(JSON.stringify({ ok: true, database, operationalDatabaseUntouched: process.env.DB_NAME }));
  } finally {
    await eliminarCredencialesTemporales(credentials);
    const cleanup = await mysql.createConnection(connectionConfig);
    await cleanup.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await cleanup.end();
  }
})().catch(error => { console.error(error.message); process.exit(1); });
