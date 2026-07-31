# Migraciones

La fuente de evolución es `pos-backend/sql/migrations`. `scripts/migrate.js` ejecuta preflight, comprueba base/tablas/InnoDB, valida SHA-256 de migraciones ya aplicadas y registra cada versión.

Procedimiento: respaldo verificado, conteos previos, cuenta DDL temporal, `npm run db:migrate`, `SELECT * FROM schema_migrations`, conteos posteriores y pruebas. La migración 001 es aditiva y no elimina históricos.

Rollback: detenga el POS, conserve el SQL fallido y restaure el respaldo lógico previo mediante el flujo documentado. No improvise eliminaciones de columnas; el rollback seguro es restaurar el respaldo completo.
