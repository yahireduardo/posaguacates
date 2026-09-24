const normalizarIp = value => String(value || 'desconocida').replace(/^::ffff:/, '').slice(0, 45);
const normalizarUsuario = value => String(value || '').trim().toLowerCase().slice(0, 50);

class LoginRateLimitService {
  constructor({ db, maxIntentos = Number(process.env.LOGIN_RATE_LIMIT_MAX || 10), ventanaMs = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 900000) }) {
    Object.assign(this, { db, maxIntentos, ventanaMs });
  }
  async estado(ip, username) {
    const [rows] = await this.db.query('SELECT fallos,ventana_inicio,bloqueado_hasta FROM intentos_login WHERE ip=? AND username=?', [normalizarIp(ip), normalizarUsuario(username)]);
    const row = rows[0], ahora = Date.now();
    if (!row) return { bloqueado: false, restantes: this.maxIntentos };
    const hasta = row.bloqueado_hasta ? new Date(row.bloqueado_hasta).getTime() : 0;
    if (hasta > ahora) return { bloqueado: true, reintentarEnMs: hasta - ahora };
    const inicio = new Date(row.ventana_inicio).getTime();
    if (!Number.isFinite(inicio) || ahora - inicio >= this.ventanaMs) {
      await this.limpiar(ip, username);
      return { bloqueado: false, restantes: this.maxIntentos };
    }
    return { bloqueado: false, restantes: Math.max(0, this.maxIntentos - Number(row.fallos)) };
  }
  async registrarFallo(ip, username) {
    const claveIp = normalizarIp(ip), claveUsuario = normalizarUsuario(username);
    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query('SELECT fallos,ventana_inicio FROM intentos_login WHERE ip=? AND username=? FOR UPDATE', [claveIp, claveUsuario]);
      const row = rows[0], ahora = Date.now();
      const vigente = Boolean(row && ahora - new Date(row.ventana_inicio).getTime() < this.ventanaMs);
      const fallos = (vigente ? Number(row.fallos) : 0) + 1;
      const bloqueado = fallos >= this.maxIntentos;
      await connection.query(`INSERT INTO intentos_login(ip,username,fallos,ventana_inicio,bloqueado_hasta)
        VALUES(?,?,?,NOW(),?) ON DUPLICATE KEY UPDATE fallos=VALUES(fallos),
        ventana_inicio=IF(?,ventana_inicio,NOW()),bloqueado_hasta=VALUES(bloqueado_hasta)`,
        [claveIp, claveUsuario, fallos, bloqueado ? new Date(ahora + this.ventanaMs) : null, vigente ? 1 : 0]);
      await connection.commit();
      return { bloqueado, restantes: Math.max(0, this.maxIntentos - fallos) };
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }
  async limpiar(ip, username) {
    await this.db.query('DELETE FROM intentos_login WHERE ip=? AND username=?', [normalizarIp(ip), normalizarUsuario(username)]);
  }
}
module.exports = { LoginRateLimitService, normalizarIp, normalizarUsuario };
