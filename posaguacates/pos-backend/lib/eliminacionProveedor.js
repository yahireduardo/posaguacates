function validarConfirmacionProveedor(confirmacion) {
  return String(confirmacion || '').trim().toUpperCase() === 'ELIMINAR PROVEEDOR';
}

function proveedorTieneCompras(uso = {}) {
  return Number(uso.compras) > 0;
}

module.exports = { validarConfirmacionProveedor, proveedorTieneCompras };
