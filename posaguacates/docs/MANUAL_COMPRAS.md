# Compras y entradas

En **Inventario → Compras / Entradas**, seleccione un proveedor activo, folio, referencia y observaciones. Agregue productos activos con cantidad y costo unitario. Los kilos aceptan decimales positivos; las cajas solo enteros o medias cajas.

La confirmación usa una clave de idempotencia para impedir doble registro. En una transacción se crean cabecera, detalles y cuenta por pagar, se bloquean productos, se incrementa stock, se registran movimientos y se actualiza el último costo proveedor–producto. Cualquier error produce rollback completo.

Una compra solo puede cancelarse cuando el stock incorporado no fue consumido y no tiene pagos activos. La cancelación restaura stock, anula la deuda, genera movimientos de salida y conserva el historial.
