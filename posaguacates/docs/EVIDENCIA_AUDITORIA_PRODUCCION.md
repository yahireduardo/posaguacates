# Evidencia de auditoría de producción

Fecha: 2026-08-11. Todas las operaciones destructivas se ejecutan exclusivamente en bases temporales autorizadas. La base operativa `posaguacates` no se modifica.

## Restauración física completa — ✅ PROBADO

Base temporal: `test_posaguacates_restore`, eliminada al finalizar.

Flujo ejecutado:

1. Creación de BD vacía.
2. Importación de `sql/posaguacates.sql` mediante `mariadb.exe`.
3. Aplicación real de migraciones 001–007 y 010.
4. Inserción de productos, clientes, venta, detalle, movimiento, crédito, proveedor, compra, usuario y configuración ficticios.
5. Captura de conteos, hashes SHA-256 y valores de control.
6. Creación real de ZIP mediante `mariadb-dump.exe`.
7. Verificación de firma `HMAC-SHA256`.
8. Modificación deliberada del stock a 777 e inserción de un cliente extraño.
9. Análisis y restauración real mediante `mariadb.exe`.
10. Comparación posterior y eliminación de la BD temporal.

Resultado: coincidencia exacta antes/después en `productos`, `clientes`, `ventas`, `detalle_venta`, `movimientos_inventario`, `cuentas_por_cobrar`, `pagos`, `aplicaciones_pago`, `proveedores`, `compras`, `detalle_compra`, `usuarios`, `configuracion_negocio`, stock, total y saldo. `allBusinessDataRestored=true`.

La restauración generó primero el respaldo de emergencia `PRE_RESTORE_*.zip`, como exige el diseño.

## Actualización desde versión anterior — ✅ PROBADO

Base temporal: `test_posaguacates_update`, eliminada al finalizar.

Se construyó una versión anterior real con esquema base y migraciones 001–007. Se insertaron datos ficticios en productos, clientes, ventas, detalle, movimientos, cuentas por cobrar, pagos, aplicaciones, proveedores, compras, detalle de compra, usuarios y configuración.

Antes de actualizar se guardaron conteos y hashes SHA-256 sobre todas las columnas existentes. Después se ejecutó el migrador actual, que reconoció 001–007 y aplicó 010. La comparación de las columnas anteriores fue idéntica en las trece tablas (`allPreserved=true`). Aparecieron las seis columnas de idempotencia esperadas y se realizó una escritura nueva correctamente después de actualizar.

Nota metodológica: `SELECT *` cambió legítimamente en `pagos` al añadirse columnas nuevas `NULL`; por eso la prueba definitiva proyectó exactamente las columnas de la versión anterior y verificó las nuevas por separado.

## Instalación limpia y E2E — ✅ PROBADO

Base temporal: `posaguacates_test`, eliminada al finalizar.

- Esquema limpio importado.
- Migraciones 001–010 aplicadas.
- Recorrido HTTP integral exitoso: login, roles, productos, proveedor, inventario, compra, pago a proveedor, venta contado, ticket, venta crédito, abono, cancelación, orden, reportes, estadísticas, bloqueo/traslado y reactivación.
- Repetición de venta, compra, pago de cliente y pago de proveedor devolvió la operación original sin duplicar efectos.
- Un fallo SQL descubierto en el primer recorrido fue corregido como `AUD-007` y el recorrido completo pasó después.

## Concurrencia e interrupción transaccional — ✅ PROBADO

- Dos cajas enviaron simultáneamente ventas de 7 unidades contra un stock de 10.
- Resultado HTTP: una venta 201 y un conflicto 409; una sola venta persistida; stock final 3, nunca -4.
- Dos peticiones simultáneas con la misma clave produjeron una sola venta y un solo descuento: stock 10 → 8.
- MariaDB produjo variantes reales `ER_LOCK_DEADLOCK` y `ER_CHECKREAD`; `AUD-010` las convirtió en conflicto recuperable o respuesta idempotente después del rollback.
- Un trigger temporal lanzó `SQLSTATE 45000` al insertar el detalle, después de comenzar la transacción de venta.
- Resultado del fallo inducido: HTTP 500 genérico, conteo de ventas sin cambio y stock conservado en 10. No quedó registro parcial.

Después del escenario se ejecutaron trece invariantes automáticas: stock, estados/saldos de CxC, totales de ventas y compras, pagos/aplicaciones, huérfanos, aplicaciones canceladas y formas de cobro. Todas devolvieron cero anomalías.

Comandos reproducibles:

```text
npm run audit:integration
npm run audit:integrity
```

El primer comando crea, migra, prueba y elimina `posaguacates_test`. Requiere `SOURCE_ENV_PATH` apuntando a credenciales con permisos exclusivos sobre una base de testing.

## Dinero y calendario local — ✅ PROBADO

- Valores aceptados y conservados en centavos: `0.01`, `0.1`, `0.10`, `10.99`, `99.99` y `1000.50`.
- `1.005` se rechaza: no se redondea silenciosamente.
- La fecha predeterminada del frontend usa calendario local, no UTC.
- En la BD temporal se insertaron ventas a `00:00:01` y el día anterior a `23:59:59`.
- `/stats` incrementó `ventas_hoy` exactamente en uno; el filtro incluyó la primera y excluyó la segunda.
- Windows, Node y MariaDB estaban configurados en hora de México/SYSTEM. Una PC con zona distinta no fue probada.

## Rendimiento aislado — ✅ PROBADO

Comando: `npm run audit:performance`. Crea y elimina `posaguacates_test`.

| Consulta | Resultado en esta PC |
|---|---:|
| Listar 10 000 productos | 52.64 ms / 10 000 filas |
| Venta por PK | 1.04 ms |
| Agregado anual sobre 10 000 ventas | 3.53 ms |
| Top productos sobre 100 000 detalles | 119.64 ms |

No es una prueba multiusuario sostenida ni un SLA.

## Predicción histórica — ❓ NO COMPROBABLE CON LOS DATOS DISPONIBLES

`npm run audit:prediction` fue de solo lectura. Existía una sola semana agregable y cero productos con las trece semanas mínimas. MAE, RMSE y MAPE quedaron `null`; no se puede afirmar que el método supera las tres baselines.

## Instalador, servicio y pantalla — estados honestos

- 🟡 Código Inno Setup/PowerShell y WinSW revisado: x64, administrador, runtimes incluidos, servicio automático retrasado y reinicio a los 5 segundos.
- ❌ El empaquetado previo al EXE falló al limpiar un `dist` anterior por acceso denegado. No se compiló el instalador final.
- ❓ No se ejecutaron instalación, reinstalación, desinstalación, reinicio de Windows, caída real de MariaDB ni recuperación en otra PC.
- ❌ Edge headless falló por GPU/sandbox y no produjo capturas en las tres resoluciones pedidas. Las reglas responsivas solo quedaron revisadas.

## Seguridad y dependencias

- ✅ `npm run security:check`: 161 archivos versionados, sin secretos ni artefactos prohibidos.
- ❓ `npm audit` no pudo consultar el registro por conectividad/certificado; no se conserva la afirmación anterior de “0 vulnerabilidades”.
- 🟡 Logout sin revocación del JWT y rate limit en memoria, reiniciable con el backend.
