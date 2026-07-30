function fallo(mensaje, status) {
  return Object.assign(new Error(mensaje), { status });
}

function prepararReversionPago(pago, aplicaciones) {
  if (!pago) throw fallo('Pago no encontrado', 404);
  if (pago.estado === 'CANCELADO') throw fallo('El pago ya está cancelado', 409);
  if (!Array.isArray(aplicaciones) || !aplicaciones.length) {
    throw fallo('El pago no tiene aplicaciones para revertir', 409);
  }
  if (aplicaciones.some(aplicacion => aplicacion.cuenta_estado === 'CANCELADA')) {
    throw fallo('No se puede revertir un pago ligado a una venta cancelada', 409);
  }
  return aplicaciones.map(aplicacion => ({
    ...aplicacion,
    saldo_nuevo: Math.min(
      Number(aplicacion.total_deuda),
      Number(aplicacion.saldo_pendiente) + Number(aplicacion.monto_aplicado)
    )
  }));
}

module.exports = { prepararReversionPago };
