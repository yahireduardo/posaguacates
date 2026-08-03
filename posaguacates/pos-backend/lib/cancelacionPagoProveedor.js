function prepararCancelacionPagoProveedor(pago, cuenta) {
  if (!pago) return { error: 'Pago a proveedor no encontrado', status: 404 };
  if (pago.estado !== 'ACTIVO') return { error: 'El pago ya está eliminado', status: 409 };
  if (!cuenta || cuenta.estado === 'CANCELADA') return { error: 'La cuenta de la compra está cancelada', status: 409 };
  const total = Number(cuenta.total_deuda), saldo = Number(cuenta.saldo_pendiente), monto = Number(pago.monto);
  const saldoNuevo = Number((saldo + monto).toFixed(2));
  if (![total, saldo, monto].every(Number.isFinite) || monto <= 0 || saldoNuevo > total + 0.005) {
    return { error: 'El pago no puede revertirse porque produciría un saldo inválido', status: 409 };
  }
  return { saldo_nuevo: saldoNuevo, estado_cuenta: saldoNuevo > 0 ? 'PENDIENTE' : 'PAGADA' };
}

module.exports = { prepararCancelacionPagoProveedor };
