# Esquema funcional

Ventas y compras son encabezados con detalles y movimientos de inventario. Una venta a crédito crea una cuenta y movimiento de cartera; los pagos se distribuyen mediante `aplicaciones_pago`. Cancelaciones revierten exactamente sus movimientos dentro de transacciones.

`proveedores` alimenta compras y producto principal; `configuracion_negocio` define datos de ticket; `auditoria_operaciones` conserva acciones administrativas; `schema_migrations` registra versión y checksum.
## Proveedores y productos

`productos.proveedor_id` conserva el proveedor principal opcional. `producto_proveedores` representa los proveedores asociados, código del proveedor, último costo, última compra y estado. `compras.proveedor_id` conserva la relación histórica y `detalle_compra` enlaza los productos recibidos.
