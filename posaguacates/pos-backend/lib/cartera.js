function fallo(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function construirAplicaciones(cuentas, body, monto) {
  const seleccionadas = new Set((body.cuenta_ids || []).map(Number));
  const elegibles = cuentas.filter(c => seleccionadas.has(Number(c.id)));
  if (!elegibles.length) throw fallo('Selecciona al menos una nota');
  const totalSaldos = elegibles.reduce((s, c) => s + Number(c.saldo_pendiente), 0);
  if (monto > totalSaldos + 0.001) throw fallo('El pago supera los saldos seleccionados', 409);
  if (String(body.modo || 'AUTOMATICO').toUpperCase() === 'MANUAL') {
    const mapa = new Map((body.aplicaciones || []).map(a => [Number(a.cuenta_id), Number(a.monto)]));
    const aplicaciones = elegibles.map(c => ({ cuenta: c, monto: mapa.get(Number(c.id)) || 0 }));
    if (aplicaciones.some(a => a.monto <= 0 || a.monto > Number(a.cuenta.saldo_pendiente))) throw fallo('Distribución manual inválida');
    if (Math.abs(aplicaciones.reduce((s, a) => s + a.monto, 0) - monto) > 0.005) {
      throw fallo('La suma aplicada debe ser igual al monto recibido');
    }
    return aplicaciones;
  }
  let restante = monto;
  return elegibles.map(c => {
    const aplicado = Math.min(restante, Number(c.saldo_pendiente));
    restante = Number((restante - aplicado).toFixed(2));
    return { cuenta: c, monto: aplicado };
  }).filter(a => a.monto > 0);
}

module.exports = { construirAplicaciones };
