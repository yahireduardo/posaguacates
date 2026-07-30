const os = require('os');

class AuditService {
  constructor({ db, instanceControl }) {
    this.db = db;
    this.instanceControl = instanceControl;
  }

  async registrar(datos) {
    const instanceId = await this.instanceControl.obtenerInstanceId();
    const error = datos.error ? String(datos.error).replace(/password\s*=\s*\S+/gi, 'password=[OCULTA]').slice(0, 500) : null;
    await this.db.query(
      `INSERT INTO auditoria_respaldos
       (usuario_id, accion, backup_id, nombre_archivo, resultado, tamano_bytes,
        hostname, instance_id, error_resumido, detalles_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [datos.usuarioId || null, datos.accion, datos.backupId || null, datos.nombreArchivo || null,
        datos.resultado, datos.tamanoBytes || null, os.hostname(), instanceId, error,
        datos.detalles ? JSON.stringify(datos.detalles) : null]
    );
  }
}

module.exports = { AuditService };
