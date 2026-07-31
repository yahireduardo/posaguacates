const MENSAJE_CAJAS = 'En cajas solo se permiten cantidades enteras o medias cajas, por ejemplo 1, 1.5, 2 o 2.5.';
const MENSAJE_KILOS = 'Ingresa una cantidad válida en kilos.';

function esCaja(unidad) {
  return ['CAJA', 'CAJAS'].includes(String(unidad || '').trim().toUpperCase());
}

function esCantidadValida(cantidad, unidad) {
  const valor = Number(cantidad);
  if (!Number.isFinite(valor) || valor <= 0) return false;
  return !esCaja(unidad) || Number.isInteger(valor * 2);
}

function mensajeCantidad(unidad) {
  return esCaja(unidad) ? MENSAJE_CAJAS : MENSAJE_KILOS;
}

function validarCantidad(cantidad, unidad, crearError = message => new Error(message)) {
  if (!esCantidadValida(cantidad, unidad)) throw crearError(mensajeCantidad(unidad));
  return Number(cantidad);
}

module.exports = {
  MENSAJE_CAJAS,
  MENSAJE_KILOS,
  esCaja,
  esCantidadValida,
  mensajeCantidad,
  validarCantidad
};
