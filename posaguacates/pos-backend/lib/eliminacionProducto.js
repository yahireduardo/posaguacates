function validarConfirmacionProducto(confirmacion) {
  return String(confirmacion || '').trim().toUpperCase() === 'ELIMINAR PRODUCTO';
}

function motivoBloqueoProducto(uso = {}) {
  if (Number(uso.movimientos) > 0) return 'No se puede eliminar: el producto tiene movimientos de inventario registrados';
  if (Number(uso.ventas) + Number(uso.compras) + Number(uso.ordenes) > 0) return 'No se puede eliminar: el producto tiene historial en ventas, compras u órdenes';
  return null;
}

module.exports = { validarConfirmacionProducto, motivoBloqueoProducto };
