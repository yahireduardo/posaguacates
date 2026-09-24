const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: process.env.SOURCE_ENV_PATH || path.join(__dirname, '..', '.env'), override: process.env.POS_ENV_OVERRIDE === '1', quiet: true });
const db = require('../db/conexion');
const { backupService } = require('../services/backupRuntime');
const { extraerZipSeguro } = require('../utils/safeZip');
const { hashFile } = require('../utils/hashFile');
const { claveFirma, verificarFirmaManifest } = require('../services/backupService');

async function verificarZip(zipPath) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pos-update-check-'));
  try {
    const extraido = await extraerZipSeguro(zipPath, dir, Number(process.env.BACKUP_MAX_SIZE_MB || 500) * 1024 * 1024);
    const manifest = JSON.parse(await fs.readFile(extraido.manifestPath, 'utf8'));
    const stat = await fs.stat(extraido.sqlPath), hash = await hashFile(extraido.sqlPath);
    if (manifest.database !== process.env.DB_NAME || manifest.sqlSize !== stat.size || manifest.sha256 !== hash ||
        !verificarFirmaManifest(manifest, claveFirma(process.env))) throw new Error('El respaldo previo no superó firma, hash o compatibilidad');
    return manifest;
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
}

async function main() {
  const output = path.resolve(process.argv[2] || 'update-backups');
  await fs.mkdir(output, { recursive: true });
  const [[database]] = await db.promise.query('SELECT DATABASE() nombre');
  if (database.nombre !== process.env.DB_NAME) throw new Error('La conexión no corresponde a DB_NAME');
  if (process.env.EXPECTED_UPDATE_DATABASE && database.nombre !== process.env.EXPECTED_UPDATE_DATABASE) {
    throw new Error('Preflight abortado: la BD efectiva no es la base aislada esperada');
  }
  for (const table of ['usuarios','productos','clientes','ventas','schema_migrations']) {
    await db.promise.query(`SELECT COUNT(*) total FROM \`${table}\``);
  }
  const [[admin]] = await db.promise.query("SELECT id FROM usuarios WHERE rol='ADMON_GRAL' AND activo=1 ORDER BY id LIMIT 1");
  if (!admin) throw new Error('No existe un administrador activo para auditar el respaldo previo');
  const creado = await backupService.crearZip(admin.id, { emergency: true });
  const destino = path.join(output, `PRE_UPDATE_${Date.now()}.zip`);
  await fs.copyFile(creado.zipPath, destino);
  const manifest = await verificarZip(destino);
  await fs.rm(creado.tempDir, { recursive: true, force: true });
  const secretos = ['JWT_SECRET','BACKUP_SIGNING_KEY','OPENAI_API_KEY','DB_PASSWORD'];
  const secretFingerprints = Object.fromEntries(secretos.filter(k => process.env[k]).map(k =>
    [k, crypto.createHash('sha256').update(process.env[k]).digest('hex')]
  ));
  console.log(JSON.stringify({ ok: true, backupPath: destino, backupId: manifest.backupId,
    database: manifest.database, secretFingerprints }));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => db.promise.end());
