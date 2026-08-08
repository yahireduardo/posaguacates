const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { preguntar, preguntarOculto, validarPassword } = require('./lib/entradaSegura');
const { splitStatements, migrationChecksum } = require('./migrate');

const backend = path.join(__dirname, '..');
const validarIdentificador = value => /^[A-Za-z0-9_]+$/.test(value);
const pedir = async (texto, defecto) => (await preguntar(`${texto}${defecto ? ` [${defecto}]` : ''}: `)) || defecto;
const instalacionAutomatica = process.env.POS_INSTALL_NONINTERACTIVE === '1';
const valorInstalacion = (nombre, defecto = '') => process.env[nombre] || defecto;

async function main() {
  if (fs.existsSync(path.join(backend, '.env'))) throw new Error('Ya existe .env. Para proteger una instalación existente, no se sobrescribirá.');
  console.log('Configuración inicial de POS Aguacates. MariaDB debe estar instalado y ejecutándose.');
  const host = instalacionAutomatica ? valorInstalacion('POS_DB_HOST', '127.0.0.1') : await pedir('Servidor MariaDB', '127.0.0.1');
  const port = Number(instalacionAutomatica ? valorInstalacion('POS_DB_PORT', '3306') : await pedir('Puerto MariaDB', '3306'));
  const adminDb = instalacionAutomatica ? valorInstalacion('POS_DB_ADMIN', 'root') : await pedir('Usuario administrador de MariaDB', 'root');
  const adminDbPassword = instalacionAutomatica ? valorInstalacion('POS_DB_ADMIN_PASSWORD') : await preguntarOculto('Contraseña del administrador de MariaDB: ');
  const database = instalacionAutomatica ? valorInstalacion('POS_DB_NAME', 'posaguacates') : await pedir('Nombre de la base', 'posaguacates');
  const appUser = instalacionAutomatica ? valorInstalacion('POS_DB_APP_USER', 'pos_app') : await pedir('Usuario exclusivo del POS', 'pos_app');
  const appPassword = instalacionAutomatica ? valorInstalacion('POS_DB_APP_PASSWORD') : await preguntarOculto('Nueva contraseña para pos_app: ');
  validarPassword(appPassword);
  if (![database, appUser].every(validarIdentificador) || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Nombre de base, usuario o puerto inválido');

  const admin = await mysql.createConnection({ host, port, user: adminDb, password: adminDbPassword, multipleStatements: false });
  try {
    await admin.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    const userSql = mysql.escape(appUser), passSql = mysql.escape(appPassword);
    for (const accountHost of ['localhost','127.0.0.1']) {
      const hostSql=mysql.escape(accountHost);
      await admin.query(`CREATE USER IF NOT EXISTS ${userSql}@${hostSql} IDENTIFIED BY ${passSql}`);
      await admin.query(`ALTER USER ${userSql}@${hostSql} IDENTIFIED BY ${passSql}`);
      await admin.query(`GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,ALTER,INDEX,DROP,REFERENCES ON \`${database}\`.* TO ${userSql}@${hostSql}`);
    }
    await admin.query('FLUSH PRIVILEGES');
  } finally { await admin.end(); }

  const appDb = await mysql.createConnection({ host, port, user: appUser, password: appPassword, database, multipleStatements: false });
  try {
    const [[existing]] = await appDb.query("SELECT COUNT(*) total FROM information_schema.TABLES WHERE TABLE_SCHEMA=?", [database]);
    if (Number(existing.total) === 0) {
      const schema = await fsp.readFile(path.join(backend, 'sql', 'posaguacates.sql'), 'utf8');
      for (const statement of splitStatements(schema)) await appDb.query(statement);
    }
    await appDb.query(`CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(100) NOT NULL PRIMARY KEY,description VARCHAR(255) NOT NULL,checksum_sha256 CHAR(64) NOT NULL,applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    const migrationsDir = path.join(backend, 'sql', 'migrations');
    for (const file of (await fsp.readdir(migrationsDir)).filter(x => /^\d+.*\.sql$/.test(x)).sort()) {
      const sql = await fsp.readFile(path.join(migrationsDir, file), 'utf8'), checksum = migrationChecksum(sql);
      const [applied] = await appDb.query('SELECT checksum_sha256 FROM schema_migrations WHERE version=?', [file]);
      if (applied.length) { if (applied[0].checksum_sha256 !== checksum) throw new Error(`Migración modificada: ${file}`); continue; }
      for (const statement of splitStatements(sql)) await appDb.query(statement);
      await appDb.query('INSERT INTO schema_migrations(version,description,checksum_sha256) VALUES(?,?,?)', [file, 'Instalación inicial', checksum]);
    }
    const [[users]] = await appDb.query('SELECT COUNT(*) total FROM usuarios');
    if (Number(users.total) === 0) {
      const nombre = instalacionAutomatica ? valorInstalacion('POS_ADMIN_NAME', 'Administrador') : await pedir('Nombre del primer administrador', 'Administrador');
      const username = instalacionAutomatica ? valorInstalacion('POS_ADMIN_USER', 'admin') : await pedir('Usuario para iniciar sesión', 'admin');
      const password = instalacionAutomatica ? valorInstalacion('POS_ADMIN_PASSWORD') : await preguntarOculto('Contraseña del primer administrador: ');
      if (!instalacionAutomatica) validarPassword(password);
      const confirm = instalacionAutomatica ? password : await preguntarOculto('Confirma la contraseña: '); if (password !== confirm) throw new Error('Las contraseñas no coinciden');
      await appDb.query("INSERT INTO usuarios(nombre,username,password_hash,password,rol,activo) VALUES(?,?,?,NULL,'ADMON_GRAL',1)", [nombre, username, await bcrypt.hash(password, 12)]);
    }
    const [[publico]] = await appDb.query("SELECT id FROM clientes WHERE nombre_razon_social='Público General' LIMIT 1");
    if (!publico) await appDb.query("INSERT INTO clientes(nombre_razon_social,permite_credito,activo) VALUES('Público General',0,1)");
  } finally { await appDb.end(); }

  const env = [`NODE_ENV=production`,`PORT=3000`,`HOST=127.0.0.1`,`DB_HOST=${host}`,`DB_PORT=${port}`,`DB_USER=${appUser}`,`DB_PASSWORD=${appPassword}`,`DB_NAME=${database}`,'DB_CONNECT_RETRIES=60','DB_CONNECT_RETRY_MS=2000',`JWT_SECRET=${crypto.randomBytes(48).toString('hex')}`,'JWT_EXPIRES_IN=8h','CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000','LOGIN_RATE_LIMIT_WINDOW_MS=900000','LOGIN_RATE_LIMIT_MAX=10','ALLOW_DESTRUCTIVE_TEST_DELETES=false','INSTANCE_ID=','BACKUP_MAX_SIZE_MB=500',`BACKUP_DIR=${path.join(path.dirname(backend), 'backups')}`,'BACKUP_RETENTION_COUNT=30','PRE_RESTORE_RETENTION_COUNT=10','BACKUP_ANALYSIS_TOKEN_TTL_MS=600000',''].join('\r\n');
  await fsp.writeFile(path.join(backend, '.env'), env, { encoding: 'utf8', flag: 'wx' });
  console.log('Configuración terminada. La base se creó limpia y el archivo .env quedó fuera del paquete original.');
}

main().catch(error => { console.error(`Configuración cancelada: ${error.message}`); process.exitCode = 1; });
