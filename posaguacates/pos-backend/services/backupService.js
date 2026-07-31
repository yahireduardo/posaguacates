const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { ZipArchive } = require('archiver');
const { hashFile } = require('../utils/hashFile');
const { crearCredencialesTemporales, eliminarCredencialesTemporales } = require('../utils/tempCredentials');
const { ejecutarProceso } = require('../utils/processRunner');
const { SCHEMA_VERSION } = require('./instanceControlService');

function fechaArchivo(fecha = new Date()) {
  return fecha.toISOString().replace('T', '_').replace(/:/g, '-').replace(/\.\d{3}Z$/, '');
}

function configDb(env) {
  const database = String(env.DB_NAME || 'posaguacates');
  if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error('DB_NAME contiene caracteres no permitidos');
  return {
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD || '',
    database
  };
}

class BackupService {
  constructor({ db, instanceControl, audit, env = process.env, runner = ejecutarProceso,
    createCredentials = crearCredencialesTemporales, removeCredentials = eliminarCredencialesTemporales,
    hash = hashFile, now = () => new Date() }) {
    Object.assign(this, { db, instanceControl, audit, env, runner, createCredentials, removeCredentials, hash, now });
  }

  async metadataLocal() {
    const [[venta]] = await this.db.query('SELECT MAX(id) lastKnownSaleId, MAX(fecha) lastKnownSaleAt FROM ventas');
    const [[operacion]] = await this.db.query(
      `SELECT MAX(fecha) lastOperationAt FROM (
         SELECT MAX(fecha) fecha FROM ventas
         UNION ALL SELECT MAX(fecha) FROM pagos
         UNION ALL SELECT MAX(creada_at) FROM ordenes_venta
       ) operaciones`
    );
    return {
      lastKnownSaleId: Number(venta.lastKnownSaleId || 0),
      lastKnownSaleAt: venta.lastKnownSaleAt || null,
      lastOperationAt: operacion.lastOperationAt || null
    };
  }

  async crearZip(usuarioId, opciones = {}) {
    const dbConfig = configDb(this.env);
    const bin = path.resolve(this.env.MARIADB_BIN_DIR || 'C:\\Program Files\\MariaDB 12.3\\bin');
    const executable = path.join(bin, 'mariadb-dump.exe');
    const baseDir = opciones.baseDir || os.tmpdir();
    const tempDir = await fsp.mkdtemp(path.join(baseDir, 'pos-backup-'));
    const rawPath = path.join(tempDir, 'dump.sql');
    const sqlPath = path.join(tempDir, 'backup.sql');
    const manifestPath = path.join(tempDir, 'manifest.json');
    const createdAt = this.now();
    const backupId = crypto.randomUUID();
    const nombreZip = `POS_Aguacates_${fechaArchivo(createdAt)}.zip`;
    let credentials;
    try {
      await fsp.access(executable);
      credentials = await this.createCredentials(dbConfig);
      const local = await this.metadataLocal();
      const instanceId = await this.instanceControl.asegurarRegistro();
      await this.db.query(
        `INSERT INTO historial_traslados
         (backup_id,nombre_archivo,equipo_origen,generado_por,fecha_generacion,ultima_venta_id,estado)
         VALUES (?,?,?,?,?,?, 'GENERADO')`,
        [backupId, nombreZip, os.hostname(), usuarioId, createdAt, local.lastKnownSaleId]
      );
      const args = [
        `--defaults-extra-file=${credentials.ruta}`, '--ssl=0', '--single-transaction', '--quick',
        '--routines', '--events', '--triggers', '--hex-blob', '--no-create-db',
        '--default-character-set=utf8mb4', '--databases', dbConfig.database
      ];
      await this.runner(executable, args, { stdoutPath: rawPath });
      const header = [
        '-- POS_AGUACATES_BACKUP', `-- backup_id: ${backupId}`, `-- created_at: ${createdAt.toISOString()}`,
        `-- database: ${dbConfig.database}`, `-- app_version: ${require('../package.json').version}`,
        `-- hostname: ${os.hostname()}`, `-- schema_version: ${SCHEMA_VERSION}`,
        `-- last_operation_at: ${local.lastOperationAt || ''}`, ''
      ].join('\n');
      await fsp.writeFile(sqlPath, header, { mode: 0o600 });
      await new Promise((resolve, reject) => {
        const input = fs.createReadStream(rawPath);
        const output = fs.createWriteStream(sqlPath, { flags: 'a' });
        input.on('error', reject); output.on('error', reject); output.on('finish', resolve); input.pipe(output);
      });
      const stat = await fsp.stat(sqlPath);
      const sha256 = await this.hash(sqlPath);
      const manifest = {
        format: 'POS_AGUACATES_BACKUP', version: 1, backupId, createdAt: createdAt.toISOString(),
        database: dbConfig.database, hostname: os.hostname(), instanceId,
        appVersion: require('../package.json').version, schemaVersion: SCHEMA_VERSION,
        sqlFile: 'backup.sql', sqlSize: stat.size, sha256,
        lastKnownSaleId: local.lastKnownSaleId, lastKnownSaleAt: local.lastKnownSaleAt,
        lastOperationAt: local.lastOperationAt, generatedByUserId: Number(usuarioId)
      };
      await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2), { mode: 0o600 });
      const zipPath = path.join(tempDir, nombreZip);
      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath, { mode: 0o600 });
        const archive = new ZipArchive({ zlib: { level: 9 } });
        output.on('close', resolve); output.on('error', reject); archive.on('error', reject);
        archive.pipe(output);
        archive.file(sqlPath, { name: 'backup.sql' });
        archive.file(manifestPath, { name: 'manifest.json' });
        archive.finalize();
      });
      await this.db.query(
        `UPDATE control_instancia_pos SET backup_id_actual=?, ultimo_respaldo_generado=NOW()
         WHERE instance_id=?`,
        [backupId, instanceId]
      );
      const zipStat = await fsp.stat(zipPath);
      await this.audit.registrar({
        usuarioId, accion: 'EXPORTAR', backupId, nombreArchivo: nombreZip,
        resultado: 'EXITOSO', tamanoBytes: zipStat.size
      });
      return { zipPath, tempDir, nombreZip, manifest };
    } catch (error) {
      try {
        await this.audit.registrar({ usuarioId, accion: 'EXPORTAR', backupId, nombreArchivo: nombreZip,
          resultado: 'FALLIDO', error: error.code || error.message });
      } catch (_) { /* El error original tiene prioridad. */ }
      await fsp.rm(tempDir, { recursive: true, force: true });
      if (error.code === 'ENOENT') {
        throw Object.assign(new Error('No se encontró la herramienta de respaldo de MariaDB.'), { status: 503 });
      }
      throw error;
    } finally {
      await this.removeCredentials(credentials);
    }
  }
}

module.exports = { BackupService, configDb, fechaArchivo };
