# Migraciones

La fuente de evolución es `pos-backend/sql/migrations`. `scripts/migrate.js` ejecuta preflight, comprueba base/tablas/InnoDB, valida SHA-256 de migraciones ya aplicadas y registra cada versión.

En una base vacía importe primero `pos-backend/sql/posaguacates.sql`, que contiene exclusivamente estructura sanitizada, y luego ejecute las migraciones. La cuenta `pos_app` no necesita ni debe conservar permiso para crear bases; use una cuenta DDL temporal y revóquela al terminar.

La migración `002_autorizaciones_admin.sql` incorpora al proceso automático la tabla de auditoría que anteriormente se entregaba como SQL manual. Es idempotente y no elimina datos.

Procedimiento: respaldo verificado, conteos previos, cuenta DDL temporal, `npm run db:migrate`, `SELECT * FROM schema_migrations`, conteos posteriores y pruebas. La migración 001 es aditiva y no elimina históricos.

Rollback: detenga el POS, conserve el SQL fallido y restaure el respaldo lógico previo mediante el flujo documentado. No improvise eliminaciones de columnas; el rollback seguro es restaurar el respaldo completo.
