# Migraciones

La fuente de evolución es `pos-backend/sql/migrations`. `scripts/migrate.js` ejecuta preflight, comprueba base/tablas/InnoDB, valida SHA-256 de migraciones ya aplicadas y registra cada versión.

En una base vacía importe primero `pos-backend/sql/posaguacates.sql`, que contiene exclusivamente estructura sanitizada, y luego ejecute las migraciones. La cuenta `pos_app` no necesita ni debe conservar permiso para crear bases; use una cuenta DDL temporal y revóquela al terminar.

La migración `002_autorizaciones_admin.sql` incorpora al proceso automático la tabla de auditoría que anteriormente se entregaba como SQL manual. Es idempotente y no elimina datos.

La migración `003_proveedores_productos.sql` agrega razón social y la relación idempotente `producto_proveedores`. Migra los proveedores principales existentes sin borrar ni duplicar información. El rollback operativo es restaurar el respaldo lógico verificado previo a la migración.

La migración `004_ventas_credito_sin_metodo.sql` permite que las ventas a crédito conserven método y referencia vacíos hasta que el cliente realice un pago. Las ventas de contado mantienen los métodos efectivo, transferencia y cheque.

La migración `005_cuentas_proveedores.sql` crea cuentas por pagar y pagos a proveedores. Cada compra activa existente se incorpora una sola vez como deuda pendiente y las compras nuevas crean su cuenta dentro de la misma transacción.

Procedimiento: respaldo verificado, conteos previos, cuenta DDL temporal, `npm run db:migrate`, `SELECT * FROM schema_migrations`, conteos posteriores y pruebas. La migración 001 es aditiva y no elimina históricos.

Rollback: detenga el POS, conserve el SQL fallido y restaure el respaldo lógico previo mediante el flujo documentado. No improvise eliminaciones de columnas; el rollback seguro es restaurar el respaldo completo.
