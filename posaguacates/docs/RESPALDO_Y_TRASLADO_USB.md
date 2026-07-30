# Respaldo y traslado por USB

El módulo está integrado en la pestaña administrativa **Respaldo y traslado** del POS.

## Preparación

1. Instale MariaDB 12.3 y confirme que existen `mariadb-dump.exe` y `mariadb.exe`.
2. Configure en el `.env` local las variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME`. No incluya ese archivo en Git.
3. Ejecute la migración `pos-backend/sql/migracion_respaldo_traslado.sql` con un usuario autorizado. La migración es idempotente y no borra información.
4. Reinicie el backend después de aplicar la migración.

Ejemplo de aplicación sin exponer la contraseña en la línea de comandos:

```powershell
& "C:\Program Files\MariaDB 12.3\bin\mariadb.exe" --defaults-extra-file="C:\ruta\privada\client.cnf" posaguacates < .\pos-backend\sql\migracion_respaldo_traslado.sql
```

En PowerShell, si la redirección `<` no está disponible, ejecute el comando desde `cmd.exe` o desde un cliente gráfico de MariaDB.

## Variables

```dotenv
INSTANCE_ID=
BACKUP_MAX_SIZE_MB=500
BACKUP_DIR=C:\posaguacates\backups
MARIADB_BIN_DIR=C:\Program Files\MariaDB 12.3\bin
BACKUP_RETENTION_COUNT=30
PRE_RESTORE_RETENTION_COUNT=10
BACKUP_ANALYSIS_TOKEN_TTL_MS=600000
```

Si `INSTANCE_ID` queda vacío, el sistema crea un UUID en `pos-backend/data/instance-id`. Ese archivo es local, está ignorado por Git y nunca se incluye en un respaldo SQL.

## Endpoints administrativos

Todos requieren una sesión JWT. `GET /backups/status` está disponible también para `CAJERO` para que la interfaz pueda mostrar y respetar inmediatamente el estado `ENTREGADA`. Los demás requieren `ADMON_GRAL`:

- `GET /backups/status`
- `POST /backups/export`
- `POST /backups/analyze`, multipart con campo `backup`
- `POST /backups/restore`
- `POST /backups/mark-transferred`
- `POST /backups/reactivate`
- `GET /backups/history`

Restaurar, entregar y reactivar vuelven a solicitar la contraseña del administrador. Analizar no restaura: entrega un token temporal ligado al usuario y al hash. Para restaurar se debe enviar `confirmacion: "RESTAURAR"`.

## Flujo de operación

En el origen:

1. Termine ventas, pagos y movimientos.
2. Genere y descargue el ZIP.
3. Guárdelo en la USB.
4. Confirme que el archivo existe y después marque la computadora como `ENTREGADA`.

En el destino:

1. Seleccione el ZIP.
2. Analícelo.
3. Revise fecha, equipo, última venta, hash y advertencias.
4. Confirme la restauración con la contraseña administrativa.
5. Reinicie el servicio si el resultado indica `restartRequired`.

`ENTREGADA` bloquea escrituras en el backend, aunque se intente omitir la interfaz. Permite login, consultas y las operaciones del módulo de respaldo. La reactivación manual exige contraseña y motivo y puede causar divergencia.

## Recuperación y retención

Antes de ejecutar una restauración se crea un ZIP de emergencia en:

`C:\posaguacates\backups\pre-restore`

Se conservan al menos los últimos 10, configurable mediante `PRE_RESTORE_RETENTION_COUNT`. Si `mariadb.exe` falla después de comenzar, el servicio intenta restaurar automáticamente el respaldo previo. Si también falla, no repita operaciones: conserve los archivos y solicite asistencia técnica.

Para recuperación manual, use únicamente el script existente `scripts/backup/restore-db.ps1` con el respaldo verificado y durante una ventana de mantenimiento. Este procedimiento es destructivo y requiere autorización expresa.

## USB perdida o respaldo dañado

- Una USB perdida debe tratarse como información confidencial: cambie de medio y genere un respaldo nuevo.
- Un hash incorrecto impide la restauración. No edite el ZIP ni el SQL; vuelva al equipo origen y genere otro.
- No trabaje en dos computadoras a la vez. El control local reduce errores, pero sin un servidor central no puede impedir una copia manual fuera del sistema.

## Registros

Las operaciones quedan en `auditoria_respaldos` y `historial_traslados`. Los errores se resumen sin contraseñas ni contenido del `.env`. Los logs generales del servicio se guardan conforme a la instalación Windows documentada en `INSTALACION_EMPRESA.md`.

## Pruebas sin producción

```powershell
cd pos-backend
npm run backup:test
```

Las pruebas inyectan base, ejecutores y archivos simulados. No llaman a MariaDB, no ejecutan restauraciones reales y no usan el `.env` de producción.

## Pruebas manuales de la interfaz

Realice estas pruebas únicamente con el backend de desarrollo y respuestas simuladas. No pulse la confirmación final de restauración contra producción.

1. Inicie sesión como `CAJERO`: la pestaña **Respaldo y traslado** no debe aparecer.
2. Inicie sesión como `ADMON_GRAL`: la pestaña debe aparecer y mostrar estado, equipo e instalación.
3. Simule `GET /backups/status` con estado `ENTREGADA`: debe mostrarse la barra persistente, bloquear controles de escritura y conservar consultas y cierre de sesión.
4. Genere un respaldo de una base de pruebas: debe descargarse un ZIP, mostrar nombre/tamaño y habilitar **Marcar esta computadora como entregada** sin marcarla automáticamente.
5. Seleccione un `.txt`: debe rechazarse. Seleccione un ZIP válido mediante selector y mediante arrastrar y soltar.
6. Agregue un producto al carrito e intente analizar: debe mostrarse “Debe finalizar o vaciar la venta actual…”.
7. Con carrito vacío, analice el ZIP: revise metadata, comparación, advertencias y que todavía no se haya restaurado.
8. Compruebe que el botón final permanezca deshabilitado sin `RESTAURAR`, contraseña y, para un respaldo antiguo, la casilla adicional.
9. Simule token vencido: el resultado debe invalidarse y exigir un análisis nuevo.
10. Simule `{ "restartRequired": true }`: la interfaz debe bloquearse temporalmente y mostrar **Volver a comprobar el sistema**.
11. Simule `/health` y `/backups/status` correctos: la interfaz debe salir del bloqueo temporal.
12. En estado `ENTREGADA`, verifique la reactivación con motivo menor a 10 caracteres, contraseña incorrecta y respuesta exitosa.
13. Revise historial vacío, historial con registros y error de red.
14. Compruebe que ningún mensaje muestre stack traces, credenciales, `spawn ENOENT` ni códigos `ER_*`.
