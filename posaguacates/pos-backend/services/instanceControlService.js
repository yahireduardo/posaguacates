const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const SCHEMA_VERSION = 'backup-transfer-v1';

class InstanceControlService {
  constructor({ db, dataDir = path.join(__dirname, '..', 'data'), env = process.env } = {}) {
    this.db = db;
    this.dataDir = dataDir;
    this.env = env;
    this.instanceId = null;
    this.restaurando = false;
    this.escriturasActivas = 0;
  }

  async obtenerInstanceId() {
    if (this.instanceId) return this.instanceId;
    const configurado = String(this.env.INSTANCE_ID || '').trim();
    if (configurado) {
      if (!/^[0-9a-f-]{36}$/i.test(configurado)) throw new Error('INSTANCE_ID no tiene formato UUID');
      this.instanceId = configurado;
      return configurado;
    }
    const ruta = path.join(this.dataDir, 'instance-id');
    await fs.mkdir(this.dataDir, { recursive: true });
    try {
      const existente = (await fs.readFile(ruta, 'utf8')).trim();
      if (/^[0-9a-f-]{36}$/i.test(existente)) {
        this.instanceId = existente;
        return existente;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const generado = crypto.randomUUID();
    try {
      await fs.writeFile(ruta, `${generado}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      this.instanceId = generado;
      return generado;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const creadoPorOtraPeticion = (await fs.readFile(ruta, 'utf8')).trim();
      if (!/^[0-9a-f-]{36}$/i.test(creadoPorOtraPeticion)) throw new Error('El INSTANCE_ID local no es válido');
      this.instanceId = creadoPorOtraPeticion;
      return creadoPorOtraPeticion;
    }
  }

  async asegurarRegistro() {
    const instanceId = await this.obtenerInstanceId();
    await this.db.query(
      `INSERT INTO control_instancia_pos (instance_id, hostname, estado, bloqueada, schema_version)
       VALUES (?, ?, 'ACTIVA', 0, ?)
       ON DUPLICATE KEY UPDATE hostname=VALUES(hostname), schema_version=VALUES(schema_version)`,
      [instanceId, os.hostname(), SCHEMA_VERSION]
    );
    return instanceId;
  }

  async obtenerEstado() {
    const instanceId = await this.asegurarRegistro();
    const [rows] = await this.db.query(
      `SELECT instance_id, hostname, estado, backup_id_actual, ultimo_respaldo_generado,
              ultimo_respaldo_restaurado, bloqueada, motivo_bloqueo, schema_version, actualizado_en
       FROM control_instancia_pos WHERE instance_id=? LIMIT 1`,
      [instanceId]
    );
    return { ...rows[0], restauracion_en_progreso: this.restaurando };
  }

  async marcarEntregada(backupId, motivo = 'Base entregada para traslado') {
    const instanceId = await this.asegurarRegistro();
    const [[respaldo]] = await this.db.query(
      `SELECT COUNT(*) total FROM historial_traslados
       WHERE backup_id=? AND equipo_origen=? AND estado='GENERADO'`,
      [backupId, os.hostname()]
    );
    if (Number(respaldo.total) !== 1) {
      throw Object.assign(new Error('El respaldo no fue generado por esta computadora o ya fue entregado'), { status: 409 });
    }
    const [result] = await this.db.query(
      `UPDATE control_instancia_pos
       SET estado='ENTREGADA', bloqueada=1, backup_id_actual=?, motivo_bloqueo=?
       WHERE instance_id=?`,
      [backupId, motivo, instanceId]
    );
    if (!result.affectedRows) throw Object.assign(new Error('No se encontró la instalación local'), { status: 409 });
    await this.db.query(
      `UPDATE historial_traslados SET estado='ENTREGADO', actualizado_en=NOW()
       WHERE backup_id=? AND estado='GENERADO'`,
      [backupId]
    );
  }

  async reactivar(motivo) {
    const instanceId = await this.asegurarRegistro();
    await this.db.query(
      `UPDATE control_instancia_pos SET estado='ACTIVA', bloqueada=0, motivo_bloqueo=?
       WHERE instance_id=?`,
      [`Reactivación administrativa: ${motivo}`, instanceId]
    );
  }

  iniciarEscritura() {
    if (this.restaurando) return false;
    this.escriturasActivas += 1;
    return true;
  }

  finalizarEscritura() {
    this.escriturasActivas = Math.max(0, this.escriturasActivas - 1);
  }

  async iniciarRestauracion({ timeoutMs = 30000 } = {}) {
    if (this.restaurando) throw Object.assign(new Error('Ya existe una restauración en progreso'), { status: 409 });
    this.restaurando = true;
    const limite = Date.now() + timeoutMs;
    while (this.escriturasActivas > 0 && Date.now() < limite) {
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    if (this.escriturasActivas > 0) {
      this.restaurando = false;
      throw Object.assign(new Error('Hay operaciones en curso. Intente restaurar nuevamente.'), { status: 409 });
    }
  }

  finalizarRestauracion() {
    this.restaurando = false;
  }

  async activarTrasRestauracion(backupId) {
    const instanceId = await this.asegurarRegistro();
    await this.db.query(
      `UPDATE control_instancia_pos
       SET estado='ACTIVA', bloqueada=0, motivo_bloqueo=NULL, backup_id_actual=?,
           ultimo_respaldo_restaurado=NOW()
       WHERE instance_id=?`,
      [backupId, instanceId]
    );
  }
}

module.exports = { InstanceControlService, SCHEMA_VERSION };
