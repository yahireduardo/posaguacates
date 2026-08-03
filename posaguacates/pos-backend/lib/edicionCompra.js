function firmaDetalles(items, campos) {
  return items.map(item => [campos.id(item), Number(campos.cantidad(item)), Number(campos.costo(item))].join(':')).sort().join('|');
}

function cambiaImporteCompra({ compra, proveedorId, total, anteriores, nuevos }) {
  return Number(proveedorId) !== Number(compra.proveedor_id) ||
    Math.abs(Number(total) - Number(compra.total)) > 0.005 ||
    firmaDetalles(anteriores, {
      id: item => item.producto_id, cantidad: item => item.cantidad, costo: item => item.precio_compra
    }) !== firmaDetalles(nuevos, {
      id: item => item.producto.id, cantidad: item => item.cantidad, costo: item => item.costo
    });
}

function calcularStockEditado(stockActual, cantidadAnterior, cantidadNueva) {
  const stock = Number(stockActual), anterior = Number(cantidadAnterior || 0), nueva = Number(cantidadNueva || 0);
  if (![stock, anterior, nueva].every(Number.isFinite) || stock < anterior) return null;
  return Number((stock - anterior + nueva).toFixed(2));
}

function totalCompraNoDisminuye(totalOriginal, totalNuevo) {
  const original = Number(totalOriginal), nuevo = Number(totalNuevo);
  return Number.isFinite(original) && Number.isFinite(nuevo) && nuevo + 0.005 >= original;
}

module.exports = { cambiaImporteCompra, calcularStockEditado, totalCompraNoDisminuye };
