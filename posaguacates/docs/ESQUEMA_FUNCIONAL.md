# Esquema funcional

Ventas y compras son encabezados con detalles y movimientos de inventario. Una venta a crédito crea una cuenta y movimiento de cartera; los pagos se distribuyen mediante `aplicaciones_pago`. Cancelaciones revierten exactamente sus movimientos dentro de transacciones.

`proveedores` alimenta compras y producto principal; `configuracion_negocio` define datos de ticket; `auditoria_operaciones` conserva acciones administrativas; `schema_migrations` registra versión y checksum.
