const fs = require('fs/promises');
const os = require('os');
const path = require('path');
require('dotenv').config({ path: process.env.SOURCE_ENV_PATH || path.join(__dirname, '..', '.env'), override: process.env.POS_ENV_OVERRIDE === '1', quiet: true });
const { extraerZipSeguro } = require('../utils/safeZip');
const { hashFile } = require('../utils/hashFile');
const { claveFirma, verificarFirmaManifest, configDb } = require('../services/backupService');
const { crearCredencialesTemporales, eliminarCredencialesTemporales } = require('../utils/tempCredentials');
const { ejecutarProceso } = require('../utils/processRunner');

async function main() {
  const zipPath = path.resolve(process.argv[2] || '');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pos-update-restore-'));
  let credentials;
  try {
    const extraido = await extraerZipSeguro(zipPath, dir, Number(process.env.BACKUP_MAX_SIZE_MB || 500) * 1024 * 1024);
    const manifest = JSON.parse(await fs.readFile(extraido.manifestPath, 'utf8'));
    const stat = await fs.stat(extraido.sqlPath), hash = await hashFile(extraido.sqlPath);
    if (manifest.database !== process.env.DB_NAME || manifest.sqlSize !== stat.size || manifest.sha256 !== hash ||
        !verificarFirmaManifest(manifest, claveFirma(process.env))) throw new Error('Rollback rechazado: respaldo inválido o incompatible');
    const cfg = configDb(process.env);
    credentials = await crearCredencialesTemporales(cfg);
    const executable = path.join(path.resolve(process.env.MARIADB_BIN_DIR || 'C:\\Program Files\\MariaDB 12.3\\bin'), 'mariadb.exe');
    await ejecutarProceso(executable, [`--defaults-extra-file=${credentials.ruta}`, '--ssl=0', cfg.database], { stdinPath: extraido.sqlPath });
    console.log(JSON.stringify({ ok: true, restoredBackupId: manifest.backupId, database: manifest.database }));
  } finally {
    await eliminarCredencialesTemporales(credentials);
    await fs.rm(dir, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
