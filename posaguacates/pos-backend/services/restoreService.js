const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { extraerZipSeguro } = require('../utils/safeZip');
const { hashFile } = require('../utils/hashFile');
const { ejecutarProceso } = require('../utils/processRunner');
const { crearCredencialesTemporales, eliminarCredencialesTemporales } = require('../utils/tempCredentials');
const { configDb } = require('./backupService');

const ESTADOS = {
  NEWER: 'RESPALDO MÁS RECIENTE',
  SAME: 'RESPALDO DE LA MISMA VERSIÓN',
  OLDER: 'RESPALDO MÁS ANTIGUO',
  UNKNOWN: 'NO SE PUEDE DETERMINAR'
};

function compararRespaldo(manifest, local) {
  if (!manifest) return { status: 'UNKNOWN', label: ESTADOS.UNKNOWN, warnings: ['El SQL no incluye manifiesto verificable.'] };
  const backupSale = Number(manifest.lastKnownSaleId || 0);
  const localSale = Number(local.lastKnownSaleId || 0);
  const backupDate = Date.parse(manifest.lastOperationAt || manifest.createdAt || '');
  const localDate = Date.parse(local.lastOperationAt || '');
  let status = 'UNKNOWN';
  if (backupSale > localSale || (backupSale === localSale && backupDate > localDate)) status = 'NEWER';
  else if (backupSale === localSale && (!Number.isFinite(backupDate) || !Number.isFinite(localDate) || backupDate === localDate)) status = 'SAME';
  else if (backupSale < localSale || (backupSale === localSale && backupDate < localDate)) status = 'OLDER';
  const warnings = status === 'OLDER'
    ? ['Se perderán los cambios locales realizados después de este respaldo. Se requiere confirmación adicional.']
    : [];
  return { status, label: ESTADOS[status], warnings };
}

class AnalysisTokens {
  constructor({ ttlMs = 10 * 60 * 1000, now = () => Date.now() } = {}) {
    this.ttlMs = ttlMs; this.now = now; this.tokens = new Map();
  }
  create(datos) {
    const token = crypto.randomBytes(32).toString('hex');
    const registro = { ...datos, expiresAt: this.now() + this.ttlMs };
    const timer = setTimeout(() => {
      const vigente = this.tokens.get(token);
      if (vigente === registro) {
        this.tokens.delete(token);
        Promise.resolve(vigente.cleanup?.()).catch(() => {});
      }
    }, this.ttlMs);
    timer.unref?.();
    registro.timer = timer;
    this.tokens.set(token, registro);
    return token;
  }
  get(token, usuarioId) {
    const datos = this.tokens.get(token);
    if (!datos || datos.expiresAt < this.now() || Number(datos.usuarioId) !== Number(usuarioId)) {
      if (datos?.expiresAt < this.now()) {
        this.tokens.delete(token);
        clearTimeout(datos.timer);
        Promise.resolve(datos.cleanup?.()).catch(() => {});
      }
      throw Object.assign(new Error('El análisis venció o no corresponde a esta sesión'), { status: 400 });
    }
    return datos;
  }
  consume(token, usuarioId) {
    const datos = this.get(token, usuarioId);
    this.tokens.delete(token);
    clearTimeout(datos.timer);
    return datos;
  }
}

class RestoreService {
  constructor({ db, backupService, instanceControl, audit, env = process.env, runner = ejecutarProceso,
    tokens = new AnalysisTokens({ ttlMs: Number(process.env.BACKUP_ANALYSIS_TOKEN_TTL_MS || 600000) }),
    hash = hashFile, unzip = extraerZipSeguro, createCredentials = crearCredencialesTemporales,
    removeCredentials = eliminarCredencialesTemporales }) {
    Object.assign(this, { db, backupService, instanceControl, audit, env, runner, tokens, hash, unzip,
      createCredentials, removeCredentials });
  }

  maxBytes() { return Number(this.env.BACKUP_MAX_SIZE_MB || 500) * 1024 * 1024; }

  async analizar(upload, usuarioId) {
    if (!upload?.path) throw Object.assign(new Error('Seleccione un archivo de respaldo'), { status: 400 });
    const extension = path.extname(upload.originalname || '').toLowerCase();
    if (!['.zip', '.sql'].includes(extension)) throw Object.assign(new Error('Solo se aceptan respaldos ZIP o SQL'), { status: 400 });
    const stat = await fs.lstat(upload.path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0 || stat.size > this.maxBytes()) {
      throw Object.assign(new Error('El respaldo no es un archivo válido o excede el tamaño permitido'), { status: 400 });
    }
    const workingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pos-analyze-'));
    let sqlPath = upload.path;
    let manifest = null;
    try {
      if (extension === '.zip') {
        const extraido = await this.unzip(upload.path, workingDir, this.maxBytes());
        sqlPath = extraido.sqlPath;
        manifest = JSON.parse(await fs.readFile(extraido.manifestPath, 'utf8'));
        if (manifest.format !== 'POS_AGUACATES_BACKUP' || manifest.version !== 1 ||
            manifest.database !== String(this.env.DB_NAME || 'posaguacates') || manifest.sqlFile !== 'backup.sql') {
          throw Object.assign(new Error('El manifiesto no corresponde a un respaldo compatible'), { status: 400 });
        }
      } else {
        const destino = path.join(workingDir, 'backup.sql');
        await fs.copyFile(upload.path, destino);
        sqlPath = destino;
      }
      const sqlStat = await fs.stat(sqlPath);
      const sha256 = await this.hash(sqlPath);
      if (manifest && (Number(manifest.sqlSize) !== sqlStat.size || manifest.sha256 !== sha256)) {
        throw Object.assign(new Error('El respaldo está dañado: tamaño o hash incorrecto'), { status: 400 });
      }
      const handle = await fs.open(sqlPath, 'r');
      const buffer = Buffer.alloc(4096);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      await handle.close();
      const cabecera = buffer.subarray(0, bytesRead).toString('utf8');
      if (!/POS_AGUACATES_BACKUP|MariaDB dump|MySQL dump/i.test(cabecera)) {
        throw Object.assign(new Error('El archivo seleccionado no corresponde a un respaldo SQL válido'), { status: 400 });
      }
      const local = await this.backupService.metadataLocal();
      const comparison = compararRespaldo(manifest, local);
      if (manifest?.backupId) {
        const [[restaurado]] = await this.db.query(
          `SELECT COUNT(*) total FROM historial_traslados WHERE backup_id=? AND estado='RESTAURADO'`,
          [manifest.backupId]
        );
        if (Number(restaurado.total) > 0) comparison.warnings.push('Este backup_id ya fue restaurado anteriormente.');
        await this.db.query(
          `INSERT INTO historial_traslados
           (backup_id,nombre_archivo,equipo_origen,equipo_destino,restaurado_por,ultima_venta_id,estado,observaciones)
           VALUES (?,?,?,?,?,?,'ANALIZADO',?)`,
          [manifest.backupId, upload.originalname, manifest.hostname || null, os.hostname(), usuarioId,
            manifest.lastKnownSaleId || null, comparison.label]
        );
      }
      const limpiar = async () => {
        await fs.rm(workingDir, { recursive: true, force: true });
        await fs.rm(upload.path, { force: true });
      };
      const token = this.tokens.create({
        usuarioId, sqlPath, workingDir, uploadPath: upload.path, sha256, manifest, comparison, cleanup: limpiar
      });
      await this.audit.registrar({
        usuarioId, accion: 'ANALIZAR', backupId: manifest?.backupId,
        nombreArchivo: upload.originalname, resultado: 'EXITOSO', tamanoBytes: stat.size,
        detalles: { comparison: comparison.status }
      });
      return {
        analysisToken: token,
        backup: manifest || { backupId: null, sqlSize: sqlStat.size, sha256, unverified: true },
        comparison
      };
    } catch (error) {
      await fs.rm(workingDir, { recursive: true, force: true });
      await fs.rm(upload.path, { force: true });
      try {
        await this.audit.registrar({ usuarioId, accion: 'ANALIZAR', nombreArchivo: upload.originalname,
          resultado: 'RECHAZADO', tamanoBytes: stat.size, error: error.message });
      } catch (_) {}
      throw error;
    }
  }

  async restaurar({ token, usuarioId, confirmacion, confirmarAntiguo = false }) {
    if (confirmacion !== 'RESTAURAR') throw Object.assign(new Error('Escriba RESTAURAR para confirmar'), { status: 400 });
    const analisis = this.tokens.get(token, usuarioId);
    if (analisis.comparison.status === 'OLDER' && confirmarAntiguo !== true) {
      throw Object.assign(new Error('Confirme expresamente la restauración de un respaldo más antiguo'), { status: 400 });
    }
    const actualHash = await this.hash(analisis.sqlPath);
    if (actualHash !== analisis.sha256) throw Object.assign(new Error('El archivo cambió después del análisis'), { status: 400 });
    this.tokens.consume(token, usuarioId);
    await this.instanceControl.iniciarRestauracion();
    let emergency;
    let credentials;
    let restoreAttempted = false;
    try {
      // Regla inquebrantable: el respaldo previo se completa antes de ejecutar mariadb.exe.
      emergency = await this.backupService.crearZip(usuarioId, { emergency: true });
      const preRestoreDir = path.join(path.resolve(this.env.BACKUP_DIR || 'C:\\posaguacates\\backups'), 'pre-restore');
      await fs.mkdir(preRestoreDir, { recursive: true });
      const emergencyZip = path.join(preRestoreDir, `PRE_RESTORE_${Date.now()}.zip`);
      await fs.copyFile(emergency.zipPath, emergencyZip);
      await this.aplicarRetencion(preRestoreDir, Number(this.env.PRE_RESTORE_RETENTION_COUNT || 10));
      const dbConfig = configDb(this.env);
      credentials = await this.createCredentials(dbConfig);
      const executable = path.join(path.resolve(this.env.MARIADB_BIN_DIR || 'C:\\Program Files\\MariaDB 12.3\\bin'), 'mariadb.exe');
      await fs.access(executable);
      restoreAttempted = true;
      await this.runner(executable, [`--defaults-extra-file=${credentials.ruta}`, '--ssl=0', dbConfig.database], {
        stdinPath: analisis.sqlPath
      });
      for (const tabla of ['clientes', 'productos', 'ventas']) {
        await this.db.query(`SELECT COUNT(*) total FROM \`${tabla}\``);
      }
      await this.instanceControl.activarTrasRestauracion(analisis.manifest?.backupId || null);
      await this.db.query(
        `INSERT INTO historial_traslados
         (backup_id,nombre_archivo,equipo_origen,equipo_destino,restaurado_por,fecha_restauracion,
          ultima_venta_id,estado,observaciones)
         VALUES (?,?,?,?,?,NOW(),?,'RESTAURADO',?)`,
        [analisis.manifest?.backupId || crypto.randomUUID(), 'backup.sql',
          analisis.manifest?.hostname || null, os.hostname(), usuarioId,
          analisis.manifest?.lastKnownSaleId || null, 'Reinicio del servicio requerido']
      );
      await this.audit.registrar({ usuarioId, accion: 'RESTAURAR', backupId: analisis.manifest?.backupId,
        nombreArchivo: 'backup.sql', resultado: 'EXITOSO' });
      return { ok: true, restartRequired: true, emergencyBackup: path.basename(emergencyZip) };
    } catch (error) {
      let recuperada = false;
      if (restoreAttempted && emergency?.manifest && emergency?.zipPath && credentials?.ruta) {
        // El rollback usa una función separada y simulable; en producción se extrae el SQL de emergencia.
        try {
          await this.rollbackEmergency(emergency, credentials);
          recuperada = true;
        } catch (rollbackError) {
          error.rollbackError = rollbackError.message;
        }
      }
      try {
        await this.audit.registrar({ usuarioId, accion: 'RESTAURAR', backupId: analisis.manifest?.backupId,
          nombreArchivo: 'backup.sql', resultado: recuperada ? 'RECUPERADO' : 'FALLIDO', error: error.message });
      } catch (_) {}
      throw Object.assign(new Error(recuperada
        ? 'La restauración falló y se recuperó la base anterior.'
        : 'La restauración falló. Se requiere recuperación manual.'), { status: 500, cause: error });
    } finally {
      this.instanceControl.finalizarRestauracion();
      await this.removeCredentials(credentials);
      if (emergency?.tempDir) await fs.rm(emergency.tempDir, { recursive: true, force: true });
      await fs.rm(analisis.workingDir, { recursive: true, force: true });
      await fs.rm(analisis.uploadPath, { force: true });
    }
  }

  async rollbackEmergency(emergency, credentials) {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'pos-rollback-'));
    try {
      const { sqlPath } = await this.unzip(emergency.zipPath, temp, this.maxBytes());
      const config = configDb(this.env);
      const executable = path.join(path.resolve(this.env.MARIADB_BIN_DIR || 'C:\\Program Files\\MariaDB 12.3\\bin'), 'mariadb.exe');
      await this.runner(executable, [`--defaults-extra-file=${credentials.ruta}`, '--ssl=0', config.database], { stdinPath: sqlPath });
    } finally {
      await fs.rm(temp, { recursive: true, force: true });
    }
  }

  async aplicarRetencion(directorio, conservar) {
    const entradas = await fs.readdir(directorio, { withFileTypes: true });
    const archivos = [];
    for (const entrada of entradas) {
      if (!entrada.isFile() || !/^PRE_RESTORE_.*\.zip$/i.test(entrada.name)) continue;
      const ruta = path.join(directorio, entrada.name);
      archivos.push({ ruta, mtimeMs: (await fs.stat(ruta)).mtimeMs });
    }
    archivos.sort((a, b) => b.mtimeMs - a.mtimeMs);
    for (const archivo of archivos.slice(Math.max(1, conservar))) {
      await fs.rm(archivo.ruta, { force: true });
    }
  }
}

module.exports = { RestoreService, AnalysisTokens, compararRespaldo, ESTADOS };
