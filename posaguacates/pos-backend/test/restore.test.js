const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { compararRespaldo, AnalysisTokens, RestoreService } = require('../services/restoreService');

test('compara respaldos nuevos, iguales y antiguos', () => {
  const local = { lastKnownSaleId: 10, lastOperationAt: '2026-07-30T10:00:00Z' };
  assert.equal(compararRespaldo({ lastKnownSaleId: 11, createdAt: '2026-07-30T11:00:00Z' }, local).status, 'NEWER');
  assert.equal(compararRespaldo({ lastKnownSaleId: 10, createdAt: '2026-07-30T10:00:00Z' }, local).status, 'SAME');
  const old = compararRespaldo({ lastKnownSaleId: 9, createdAt: '2026-07-29T10:00:00Z' }, local);
  assert.equal(old.status, 'OLDER');
  assert.ok(old.warnings.length);
});

test('rechaza token vencido y token perteneciente a otro usuario', () => {
  let now = 100;
  const tokens = new AnalysisTokens({ ttlMs: 10, now: () => now });
  const token = tokens.create({ usuarioId: 1 });
  assert.throws(() => tokens.get(token, 2), /no corresponde/);
  now = 111;
  assert.throws(() => tokens.get(token, 1), /venció/);
});

test('token se invalida después del consumo', () => {
  const tokens = new AnalysisTokens();
  const token = tokens.create({ usuarioId: 1, hash: 'a' });
  assert.equal(tokens.consume(token, 1).hash, 'a');
  assert.throws(() => tokens.consume(token, 1));
});

test('rechaza restauración sin RESTAURAR y conserva el token', async () => {
  const tokens = new AnalysisTokens();
  const token = tokens.create({ usuarioId: 1 });
  const service = new RestoreService({ tokens, env: {}, db: {}, backupService: {}, instanceControl: {}, audit: {} });
  await assert.rejects(service.restaurar({ token, usuarioId: 1, confirmacion: 'SI' }), /RESTAURAR/);
  assert.ok(tokens.get(token, 1));
});

test('rechaza archivo distinto al analizado', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pos-restore-hash-'));
  const sql = path.join(dir, 'backup.sql');
  await fs.writeFile(sql, '-- POS_AGUACATES_BACKUP\n');
  const tokens = new AnalysisTokens();
  const token = tokens.create({
    usuarioId: 1, sqlPath: sql, sha256: 'hash-anterior', comparison: { status: 'NEWER' }
  });
  const service = new RestoreService({
    tokens, env: {}, db: {}, backupService: {}, instanceControl: {}, audit: {},
    hash: async () => 'hash-distinto'
  });
  await assert.rejects(service.restaurar({ token, usuarioId: 1, confirmacion: 'RESTAURAR' }), /cambió/);
  await fs.rm(dir, { recursive: true, force: true });
});

test('exige confirmación adicional para respaldo antiguo sin consumir token', async () => {
  const tokens = new AnalysisTokens();
  const token = tokens.create({ usuarioId: 1, comparison: { status: 'OLDER' } });
  const service = new RestoreService({ tokens, env: {}, db: {}, backupService: {}, instanceControl: {}, audit: {} });
  await assert.rejects(
    service.restaurar({ token, usuarioId: 1, confirmacion: 'RESTAURAR' }),
    /más antiguo/
  );
  assert.ok(tokens.get(token, 1));
});

test('crea respaldo de emergencia antes del comando y ejecuta rollback ante fallo', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'pos-restore-flow-'));
  const sql = path.join(base, 'backup.sql');
  const upload = path.join(base, 'upload.zip');
  const emergencyZip = path.join(base, 'emergency.zip');
  const bin = path.join(base, 'bin');
  const backupDir = path.join(base, 'backups');
  await fs.mkdir(bin);
  await fs.writeFile(path.join(bin, 'mariadb.exe'), 'simulado');
  await fs.writeFile(sql, '-- POS_AGUACATES_BACKUP\n');
  await fs.writeFile(upload, 'upload');
  await fs.writeFile(emergencyZip, 'emergency');
  const order = [];
  const tokens = new AnalysisTokens();
  const token = tokens.create({
    usuarioId: 1, sqlPath: sql, uploadPath: upload, workingDir: path.join(base, 'work'),
    sha256: 'correcto', comparison: { status: 'NEWER' }, manifest: { backupId: 'b' }
  });
  await fs.mkdir(path.join(base, 'work'));
  const instanceControl = {
    async iniciarRestauracion() { order.push('lock'); },
    finalizarRestauracion() { order.push('unlock'); }
  };
  const service = new RestoreService({
    tokens, env: {
      BACKUP_DIR: backupDir, MARIADB_BIN_DIR: bin, DB_NAME: 'posaguacates',
      DB_HOST: '127.0.0.1', DB_PORT: 3306, DB_USER: 'x', DB_PASSWORD: 'x'
    },
    db: { async query() { return [[]]; } },
    backupService: {
      async crearZip() {
        order.push('emergency');
        return { zipPath: emergencyZip, tempDir: null, manifest: { backupId: 'e' } };
      }
    },
    instanceControl,
    audit: { async registrar(row) { order.push(`audit:${row.resultado}`); } },
    hash: async () => 'correcto',
    createCredentials: async () => ({ directorio: path.join(base, 'cred'), ruta: path.join(base, 'cred.cnf') }),
    removeCredentials: async () => {},
    runner: async () => { order.push('restore'); throw new Error('fallo simulado'); }
  });
  service.rollbackEmergency = async () => { order.push('rollback'); };
  await assert.rejects(
    service.restaurar({ token, usuarioId: 1, confirmacion: 'RESTAURAR' }),
    /se recuperó/
  );
  assert.ok(order.indexOf('emergency') < order.indexOf('restore'));
  assert.ok(order.indexOf('restore') < order.indexOf('rollback'));
  assert.ok(order.includes('audit:RECUPERADO'));
  await fs.rm(base, { recursive: true, force: true });
});

test('rechaza SQL que excede el máximo y archivos incorrectos', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'pos-analyze-limit-'));
  const file = path.join(base, 'large.sql');
  await fs.writeFile(file, '-- POS_AGUACATES_BACKUP\n' + 'x'.repeat(2048));
  const service = new RestoreService({
    env: { BACKUP_MAX_SIZE_MB: '0.0001' }, db: {}, backupService: {}, instanceControl: {},
    audit: { async registrar() {} }
  });
  await assert.rejects(service.analizar({ path: file, originalname: 'large.sql' }, 1), /excede/);
  await fs.rm(base, { recursive: true, force: true });
});
