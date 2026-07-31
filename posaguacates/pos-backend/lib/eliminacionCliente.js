const idValido = valor => Number.isInteger(Number(valor)) && Number(valor) > 0;

const eliminacionDestructivaHabilitada = entorno =>
  String(entorno.ALLOW_DESTRUCTIVE_TEST_DELETES || '').toLowerCase() === 'true';

const normalizarNombre = valor => String(valor || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const esPublicoGeneral = cliente =>
  Number(cliente?.id) === 1 || normalizarNombre(cliente?.nombre_razon_social) === 'publico general';

function validarSolicitudEliminacion({ clienteId, motivo, confirmacion }) {
  if (!idValido(clienteId)) return { status: 400, error: 'Cliente inválido' };
  if (!String(motivo || '').trim()) return { status: 400, error: 'El motivo es obligatorio' };
  if (String(motivo).trim().length > 255) {
    return { status: 400, error: 'El motivo no puede exceder 255 caracteres' };
  }
  if (String(confirmacion || '').trim().toUpperCase() !== 'ELIMINAR CLIENTE') {
    return { status: 400, error: 'Escribe ELIMINAR CLIENTE para confirmar' };
  }
  return null;
}

module.exports = {
  idValido,
  eliminacionDestructivaHabilitada,
  esPublicoGeneral,
  validarSolicitudEliminacion
};
