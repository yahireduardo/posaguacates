# Eliminar datos de prueba

## Protección obligatoria

La eliminación física solo está disponible para una sesión `ADMON_GRAL` cuando el
backend tiene esta variable local:

```env
ALLOW_DESTRUCTIVE_TEST_DELETES=true
```

Reinicie el backend después de cambiarla. Antes de usar datos reales déjela en:

```env
ALLOW_DESTRUCTIVE_TEST_DELETES=false
```

Con `false`, el botón únicamente marca al cliente como inactivo. Ventas, pagos,
cuentas, inventario y auditoría se conservan. El cliente “Publico General” nunca
puede eliminarse ni desactivarse desde este flujo.

## Antes de habilitar el modo de pruebas

1. Cierre operaciones del POS.
2. Ejecute `npm run db:backup` desde `pos-backend`.
3. Confirme que aparezca `RESPALDO VERIFICADO`, tamaño y SHA-256.
4. Revise y aplique manualmente `sql/migracion_auditoria_eliminaciones.sql`.
5. Cambie temporalmente la variable a `true` y reinicie el backend.

La migración es necesaria para que el borrado físico conserve un resumen de la
operación aun después de eliminar al cliente.

## Eliminar desde Clientes

1. Inicie sesión como administrador.
2. Abra Clientes y pulse **Eliminar cliente**.
3. Revise ventas, órdenes, cuentas, pagos e inventario que regresará.
4. Capture el motivo.
5. Escriba exactamente `ELIMINAR CLIENTE`.
6. Confirme una sola vez y espere el resultado.

Las ventas activas reintegran `detalle_venta.cantidad`; las ya canceladas no
reintegran stock nuevamente. La operación usa una transacción y revierte todos
los cambios si una consulta falla.

## Diagnóstico manual

Use `sql/diagnostico_eliminacion_cliente.sql` en una copia de la base y cambie
`@cliente_id`. No ejecute instrucciones `DELETE` manuales ni dependa de cascadas:
las llaves reales son `RESTRICT`.

## Al terminar las pruebas

Cambie inmediatamente la variable a `false`, reinicie el backend y genere otro
respaldo. No habilite el borrado físico en producción.
