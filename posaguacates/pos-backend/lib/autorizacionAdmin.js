const bcrypt = require('bcryptjs');

const errorHttp = (mensaje, status) => Object.assign(new Error(mensaje), { status });

async function resolverAutorizacionAdmin({ usuario, body, buscarAdministrador }) {
  if (!usuario || !['ADMON_GRAL', 'CAJERO'].includes(usuario.rol)) {
    throw errorHttp('No tienes permiso para esta operación', 403);
  }
  if (usuario.rol === 'ADMON_GRAL') {
    const administrador = await buscarAdministrador(String(usuario.username || ''));
    if (!administrador || Number(administrador.id) !== Number(usuario.id)) {
      throw errorHttp('La sesión administrativa ya no está autorizada', 403);
    }
    return { solicitadoPor: Number(usuario.id), autorizadoPor: Number(usuario.id), delegada: false };
  }

  const username = String(body.usuario_admin || '').trim();
  const password = String(body.password_admin || '');
  if (!username || !password) {
    throw errorHttp('Se requiere autorización de un administrador', 400);
  }
  const administrador = await buscarAdministrador(username);
  const autorizado = administrador?.password_hash
    && await bcrypt.compare(password, administrador.password_hash);
  if (!autorizado) throw errorHttp('Autorización incorrecta', 401);

  return {
    solicitadoPor: Number(usuario.id),
    autorizadoPor: Number(administrador.id),
    delegada: true
  };
}

async function registrarAuditoriaSiExiste(connection, datos) {
  try {
    await connection.query(
      `INSERT INTO autorizaciones_admin
       (accion,recurso_tipo,recurso_id,solicitado_por,autorizado_por,motivo,resultado,fecha)
       VALUES (?,?,?,?,?,?,?,NOW())`,
      [datos.accion, datos.recursoTipo, datos.recursoId, datos.solicitadoPor,
        datos.autorizadoPor, datos.motivo, datos.resultado || 'AUTORIZADA']
    );
    return true;
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.warn('Auditoría pendiente: aplique sql/migracion_autorizaciones_admin.sql');
      return false;
    }
    throw error;
  }
}

module.exports = { resolverAutorizacionAdmin, registrarAuditoriaSiExiste };
