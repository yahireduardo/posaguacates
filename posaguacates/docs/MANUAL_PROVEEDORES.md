# Proveedores

Solo `ADMON_GRAL` puede crear, editar, activar o desactivar proveedores. `CAJERO` puede consultar la lista operativa, sin totales, notas ni costos, y el backend rechaza sus escrituras.

Desde **Inventario → Proveedores** puede buscar por nombre, razón social, contacto, teléfono, RFC o correo y filtrar activos/inactivos. **Nuevo proveedor** abre un formulario con nombre comercial obligatorio y datos opcionales validados. La baja es lógica: las compras y relaciones históricas nunca se eliminan.

**Detalle** muestra total histórico comprado, última compra, notas, productos suministrados, proveedor principal y último costo conocido. Los duplicados evidentes por nombre, RFC o correo se rechazan.
