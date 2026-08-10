const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { BackupService } = require('../services/backupService');
const { extraerZipSeguro, validarNombre } = require('../utils/safeZip');
const { hashFile } = require('../utils/hashFile');
const { crearCredencialesTemporales, eliminarCredencialesTemporales, obtenerSidWindows } = require('../utils/tempCredentials');

async function temporal(prefijo) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefijo));
}

function dependenciasBackup(base, overrides = {}) {
  const bin = path.join(base, 'bin');
  const credentialsDirs = [];
  const queries = [];
  const db = {
    async query(sql) {
      queries.push(sql);
      if (/MAX\(id\)/.test(sql)) return [[{ lastKnownSaleId: 12, lastKnownSaleAt: '2026-07-30T10:00:00Z' }]];
      if (/operaciones/.test(sql)) return [[{ lastOperationAt: '2026-07-30T10:00:00Z' }]];
      return [{ affectedRows: 1 }];
    }
  };
  const instanceControl = {
    async asegurarRegistro() { return '11111111-1111-4111-8111-111111111111'; }
  };
  const auditRows = [];
  const audit = { async registrar(row) { auditRows.push(row); } };
  return {
    bin, credentialsDirs, queries, auditRows, db, instanceControl, audit,
    service: new BackupService({
      db, instanceControl, audit,
      env: {
        DB_HOST: '127.0.0.1', DB_PORT: '3306', DB_USER: 'pos_app',
        DB_PASSWORD: 'secreto-de-prueba', DB_NAME: 'posaguacates', MARIADB_BIN_DIR: bin
      },
      now: () => new Date('2026-07-30T18:30:00Z'),
      runner: async (exe, args, options) => {
        assert.equal(exe, path.join(bin, 'mariadb-dump.exe'));
        assert.ok(args.some(arg => arg.startsWith('--defaults-extra-file=')));
        assert.ok(!args.some(arg => arg.includes('secreto-de-prueba')));
        await fs.writeFile(options.stdoutPath, '-- MariaDB dump\nCREATE TABLE `x` (`id` INT);\n');
      },
      createCredentials: async config => {
        const dir = await temporal('pos-cred-test-');
        credentialsDirs.push(dir);
        const ruta = path.join(dir, 'client.cnf');
        await fs.writeFile(ruta, `[client]\nuser=${config.user}\npassword=${config.password}\n`);
        return { directorio: dir, ruta };
      },
      removeCredentials: async credentials => {
        if (credentials) await fs.rm(credentials.directorio, { recursive: true, force: true });
      },
      ...overrides
    })
  };
}

test('exporta ZIP con backup.sql, manifest correcto y SHA-256', async () => {
  const base = await temporal('pos-backup-test-');
  const d = dependenciasBackup(base);
  await fs.mkdir(d.bin);
  await fs.writeFile(path.join(d.bin, 'mariadb-dump.exe'), 'simulado');
  const result = await d.service.crearZip(7, { baseDir: base });
  const extract = path.join(base, 'extract');
  const files = await extraerZipSeguro(result.zipPath, extract, 10 * 1024 * 1024);
  const manifest = JSON.parse(await fs.readFile(files.manifestPath, 'utf8'));
  assert.equal(manifest.format, 'POS_AGUACATES_BACKUP');
  assert.equal(manifest.database, 'posaguacates');
  assert.equal(manifest.generatedByUserId, 7);
  assert.equal(manifest.lastKnownSaleId, 12);
  assert.equal(manifest.sha256, await hashFile(files.sqlPath));
  assert.match(await fs.readFile(files.sqlPath, 'utf8'), /^-- POS_AGUACATES_BACKUP/);
  assert.equal(d.auditRows.at(-1).resultado, 'EXITOSO');
  await fs.rm(base, { recursive: true, force: true });
});

test('informa si mariadb-dump.exe no existe y audita el fallo', async () => {
  const base = await temporal('pos-backup-missing-');
  const d = dependenciasBackup(base);
  await assert.rejects(d.service.crearZip(1, { baseDir: base }), /herramienta de respaldo/);
  assert.equal(d.auditRows.at(-1).resultado, 'FALLIDO');
  await fs.rm(base, { recursive: true, force: true });
});

test('propaga error de credenciales del ejecutor sin exponer contraseña', async () => {
  const base = await temporal('pos-backup-auth-');
  const d = dependenciasBackup(base, {
    runner: async () => { throw Object.assign(new Error('Acceso denegado'), { code: 'MARIADB_COMMAND_FAILED' }); }
  });
  await fs.mkdir(d.bin);
  await fs.writeFile(path.join(d.bin, 'mariadb-dump.exe'), 'simulado');
  await assert.rejects(d.service.crearZip(1, { baseDir: base }), /Acceso denegado/);
  assert.doesNotMatch(d.auditRows.at(-1).error, /secreto-de-prueba/);
  await fs.rm(base, { recursive: true, force: true });
});

test('crea y elimina credenciales temporales', async () => {
  const base = await temporal('pos-credentials-');
  const credentials = await crearCredencialesTemporales({
    user: 'pos_app', password: 'solo-prueba', host: '127.0.0.1', port: 3306
  }, { base, protegerWindows: false });
  assert.match(await fs.readFile(credentials.ruta, 'utf8'), /password="solo-prueba"/);
  await eliminarCredencialesTemporales(credentials);
  await assert.rejects(fs.access(credentials.ruta));
  await fs.rm(base, { recursive: true, force: true });
});

test('resuelve el SID de Windows sin depender del nombre localizado de la cuenta', async () => {
  const llamadas = [];
  const sid = await obtenerSidWindows(async (programa, argumentos) => {
    llamadas.push([programa, argumentos]);
    return { stdout: '"NT AUTHORITY\\SYSTEM","S-1-5-18"\r\n' };
  });
  assert.equal(sid, 'S-1-5-18');
  assert.deepEqual(llamadas, [['whoami.exe', ['/user', '/fo', 'csv', '/nh']]]);
});

test('rechaza nombres Zip Slip y contenido inesperado', () => {
  assert.throws(() => validarNombre('../backup.sql'), /no permitidos/);
  assert.throws(() => validarNombre('carpeta/backup.sql'), /no permitidos/);
  assert.throws(() => validarNombre('programa.exe'), /no permitidos/);
});
