# Inventario

El administrador abre **Inventario** y navega internamente por **Existencias y movimientos**, **Productos**, **Proveedores** y **Compras / Entradas**. Las existencias muestran stock, unidad, mínimo y alerta de stock bajo. El stock no se edita desde Productos: cada cambio debe provenir de una compra o de un movimiento identificado.

Flujo recomendado: **Inventario → Proveedores → Nuevo proveedor → Productos → Compras / Entradas → Confirmar compra**. Al confirmar, el sistema registra la compra, sus detalles, el movimiento de entrada, el nuevo stock y el último costo dentro de una sola transacción.
