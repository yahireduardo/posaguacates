# CHANGELOG DE AUDITORÍA

Registro acumulativo de cambios realizados durante la auditoría técnica y de producción. La base operativa no se utiliza para pruebas destructivas.

## AUD-001

- Fecha: 2026-08-11
- Archivo: `pos-backend/routes/cuentas.js`
- Líneas: creación y cancelación de pagos
- Bug: una cancelación restauraba saldos, pero dejaba aplicaciones activas.
- Cambio: las aplicaciones se marcan `CANCELADA` dentro de la misma transacción.
- Motivo: mantener coherencia contable e historial.
- Test: suite unitaria de pagos y consulta de invariantes.
- Resultado: exitoso.

## AUD-002

- Fecha: 2026-08-11
- Archivos: `routes/ventas.js`, `routes/ordenes.js`
- Líneas: alta del movimiento inicial de crédito
- Bug: `saldo_resultante` contenía solo la nueva venta, no la cartera acumulada.
- Cambio: cálculo transaccional de la suma pendiente del cliente.
- Motivo: estado de cuenta matemáticamente correcto.
- Test: integración aislada y consultas de mayor.
- Resultado: exitoso.

## AUD-003

- Fecha: 2026-08-11
- Archivos: `routes/prediccion.js`, `test/localIntelligence.test.js`
- Líneas: ventana histórica semanal
- Bug: las semanas sin ventas no participaban y sesgaban la proyección al alza.
- Cambio: ventana de doce semanas completas con semanas vacías en cero.
- Motivo: corregir el método estadístico existente sin introducir ML.
- Test: regresiones de huecos intermedios y semanas recientes vacías; endpoint real HTTP 200.
- Resultado: exitoso.

## AUD-004

- Fecha: 2026-08-11
- Archivos: `routes/reportes.js`, `test/reportes.test.js`
- Líneas: serialización CSV
- Bug: valores iniciados con caracteres de fórmula podían ejecutarse al abrirse en una hoja de cálculo.
- Cambio: neutralización previa al escape CSV.
- Motivo: impedir CSV Injection.
- Test: fórmulas y comillas.
- Resultado: exitoso.

## AUD-005

- Fecha: 2026-08-11
- Archivos: pagos, frontend, `lib/idempotencia.js`, migración 010
- Líneas: creación de pagos de clientes y proveedores
- Bug: un reintento podía duplicar una operación económica válida.
- Cambio: clave única de idempotencia y huella SHA-256 del contenido; respuesta repetible y conflicto ante reutilización diferente.
- Motivo: proteger dinero frente a doble clic, timeout y retransmisión.
- Test: pruebas unitarias y E2E real sobre `posaguacates_test`.
- Resultado: exitoso; se comprobó una sola fila y un solo efecto financiero.

## AUD-006

- Fecha: 2026-08-11
- Archivos: servicios de backup/restore, configuración, documentación
- Líneas: manifiesto y análisis de respaldo
- Bug: el hash detectaba daño, pero no autenticaba el origen del respaldo.
- Cambio: manifiesto versión 2 firmado con HMAC-SHA256 y rechazo seguro de archivos sin firma.
- Motivo: impedir restauración silenciosa de SQL manipulado.
- Test: ZIP generado, firma válida, alteración detectada y SQL suelto rechazado.
- Resultado: exitoso en pruebas automatizadas; restauración física completa pendiente.

## AUD-007

- Fecha: 2026-08-11
- Archivo: `routes/cuentas.js`
- Líneas: `INSERT INTO pagos`
- Bug: cantidad incorrecta de marcadores SQL introducida al agregar idempotencia.
- Cambio: correspondencia exacta entre columnas y parámetros.
- Motivo: la prueba E2E devolvió HTTP 500 al aplicar un abono.
- Test: recreación limpia, migraciones 001–010 y recorrido HTTP completo.
- Resultado: exitoso.

## AUD-008

- Fecha: 2026-08-11
- Archivos: `index.js`, `middleware/instanceWritable.js`, prueba de bloqueo
- Líneas: montaje de `/tickets`
- Bug: imprimir es una petición GET que incrementa contador y podía cruzarse con una restauración.
- Cambio: el ticket participa en el bloqueo coordinado de escrituras.
- Motivo: evitar una escritura concurrente con restauración.
- Test: lectura mutante rechazada con HTTP 503 durante restauración; suite 96/96.
- Resultado: exitoso.

## AUD-009

- Fecha: 2026-08-11
- Archivo: arnés temporal de actualización (no conservado)
- Líneas: comparación anterior/posterior
- Bug: la primera comparación usaba `SELECT *` y trataba columnas nuevas `NULL` como pérdida de datos antiguos.
- Cambio: comparar las columnas de la versión anterior y verificar las columnas nuevas por separado.
- Motivo: distinguir correctamente evolución de esquema de alteración de información.
- Test: actualización física 001–007 → 010 en `test_posaguacates_update`.
- Resultado: las trece tablas conservaron exactamente conteos y valores antiguos; escritura posterior exitosa.

## AUD-010

- Fecha: 2026-08-11
- Archivo: `pos-backend/routes/ventas.js`
- Líneas: manejo de error al crear venta
- Bug: dos cajas vendiendo simultáneamente podían producir `ER_LOCK_DEADLOCK` o `ER_CHECKREAD`, ambos seguros para los datos pero expuestos como HTTP 500.
- Cambio: después del rollback, una clave ya registrada devuelve la venta original; otro conflicto concurrente devuelve HTTP 409 con mensaje comprensible.
- Motivo: conservar la protección transaccional y permitir recuperación del usuario sin presentar un fallo interno.
- Test: dos ventas simultáneas de 7 sobre stock 10 y dos solicitudes simultáneas con la misma clave.
- Resultado: E2E concurrente exitoso; una sola venta y stock final correcto.

## AUD-011

- Fecha: 2026-08-11
- Archivo: `scripts/checkIntegrity.js`
- Líneas: invariante de pagos contra aplicaciones
- Bug: el primer diagnóstico consideraba inválidos los cobros de contado, aunque estos no deben tener aplicaciones de cartera.
- Cambio: comparar contra aplicaciones solo los pagos que efectivamente poseen aplicaciones; conservar el control separado de formas de cobro.
- Motivo: el esquema real usa `pagos` tanto para cobros de contado como para abonos a crédito.
- Test: arnés E2E seguido por las trece invariantes.
- Resultado: trece invariantes en cero después del E2E; suite unitaria 96/96.

## AUD-012

- Fecha: 2026-08-11
- Archivos: `routes/cuentas.js`, `routes/cuentasProveedores.js`
- Líneas: manejo de conflictos al crear pagos
- Bug: dos abonos simultáneos sobre la misma cuenta protegían el saldo mediante locks, pero la petición perdedora recibía HTTP 500.
- Cambio: resolución idempotente de la operación ganadora o conflicto HTTP 409 después del rollback.
- Motivo: evitar errores internos visibles y facilitar recuperación segura en cajas concurrentes.
- Test: dos abonos simultáneos de 7 sobre deuda 10; fallos inducidos dentro de aplicación de pago.
- Resultado: exitoso; E2E completo, dos abonos concurrentes 201/409, saldo final 3 y trece invariantes en cero.

## AUD-013

- Fecha: 2026-08-11
- Archivos: `lib/metodosPago.js`, rutas de cuentas y pruebas
- Líneas: normalización de importes
- Bug: importes con más de dos decimales, como 1.005, podían redondearse de forma ambigua por IEEE-754.
- Cambio: aceptar únicamente dinero expresable en centavos y operar mediante redondeo a entero de centavos.
- Motivo: evitar pérdida silenciosa de fracciones y diferencias frontend/API/MariaDB.
- Test: 0.01, 0.1, 0.10, 10.99, 99.99, 1000.50 y rechazo de 1.005.
- Resultado: exitoso; prueba específica y suite completa 98/98, E2E e invariantes exitosos.

## AUD-014

- Fecha: 2026-08-11
- Archivos: `pos-frontend/js/app.js`, `test/frontendDates.test.js`
- Líneas: fechas predeterminadas de pago y reporte
- Bug: `toISOString().slice(0,10)` usa UTC y podía mostrar el día siguiente durante la tarde/noche de México.
- Cambio: construir `YYYY-MM-DD` con año, mes y día del calendario local.
- Motivo: evitar que operaciones cercanas a medianoche aparezcan con fecha visual incorrecta.
- Test: fecha local simulada y ausencia del patrón UTC en campos de pago.
- Resultado: exitoso; prueba específica, suite completa 98/98 y límite real 23:59:59/00:00:01 comprobado en MariaDB.

## AUD-015

- Fecha: 2026-08-11
- Problema/severidad: ALTA; logout no revocaba JWT y el token seguía válido.
- Archivos: `routes/auth.js`, `middleware/auth.js`, migración 011.
- Solución: sesión persistente identificada por `sid`, validación en BD y revocación atómica en logout.
- Prueba: login → logout → reinicio del servidor HTTP → reutilización del token.
- Resultado: HTTP 401 después del reinicio; E2E exitoso.

## AUD-016

- Fecha: 2026-08-11
- Problema/severidad: ALTA; el limitador de fuerza bruta se perdía al reiniciar backend.
- Archivos: `services/loginRateLimitService.js`, `routes/auth.js`, migración 011.
- Solución: conteos persistentes por IP+usuario, ventana temporal y limpieza al acertar.
- Prueba: diez fallos, reinicio HTTP, intento once y otro usuario.
- Resultado: 429 para la combinación bloqueada y 401 normal para otro usuario.

## AUD-017

- Fecha: 2026-08-11
- Problema/severidad: ALTA; movimientos manuales repetidos duplicaban stock y el primer orden de locks produjo deadlock en concurrencia.
- Archivos: `routes/inventario.js`, frontend, migración 011, E2E.
- Solución: clave/huella idempotente y orden único de locks: producto antes de clave.
- Prueba: misma operación repetida y dos entradas simultáneas distintas.
- Resultado: una sola aplicación de la clave repetida; stock 10→12 con dos entradas válidas; invariantes en cero.

## AUD-018

- Fecha: 2026-08-11
- Problema/severidad: ALTA; reconstruir staging fallaba por ACL de módulos nativos y `-Exclude` recorría `temp`.
- Archivos: `packaging/build-release.ps1`, `POSAguacates.iss`.
- Solución: staging limpio e inmutable por timestamp y copia explícita de entradas permitidas.
- Prueba: generación del payload 1.1.7-test con 175 dependencias y controles de contenido/tamaño.
- Resultado: exitoso; no se compiló instalador final.

## AUD-019

- Fecha: 2026-08-11
- Problema/severidad: ALTA; `SOURCE_ENV_PATH` no sobrescribía variables heredadas en el arnés de actualización.
- Archivos: scripts de preflight, migración, integridad, restore y `auditUpdater.js`.
- Solución: `override` obligatorio cuando se especifica archivo, DB esperada y aborto ante discrepancia.
- Prueba: actualización repetida sobre `posaguacates_test` con `EXPECTED_UPDATE_DATABASE`.
- Resultado: exitoso. Incidente: antes de corregirse, 010/011 se aplicaron aditivamente a `posaguacates`; no se borraron registros. No se intentó DDL destructivo de reversión.

## AUD-020

- Fecha: 2026-08-11
- Problema/severidad: CRÍTICA de producción; no existía actualizador diferenciado y recuperable.
- Archivos: Inno Setup, `actualizar.ps1`, `prepareUpdate.js`, `restoreUpdateBackup.js`, `auditUpdater.js`.
- Solución: detección de instalación, staging, backup firmado obligatorio, preservación byte a byte de `.env`, migraciones pendientes, invariantes, health y rollback.
- Prueba: versión 001–007 con 13 tablas y valores de control; actualización 010/011; fallo inducido posterior a migración.
- Resultado: actualización conserva hashes/conteos/stock/saldo/secretos; rollback recupera datos exactos. Las estructuras DDL aditivas pueden permanecer y son compatibles con la versión anterior.

## AUD-021

- Fecha: 2026-08-11
- Problema/severidad: MEDIA; campos basados solo en placeholder y modales sin semántica completa.
- Archivos: `pos-frontend/js/app.js`, `test/frontendAccessibility.test.js`.
- Solución: nombre accesible derivado y roles/ARIA de diálogo sin rediseño.
- Prueba: dos regresiones estáticas y capturas Chrome en tres resoluciones.
- Resultado: prueba específica 2/2, suite completa 102/102, E2E e invariantes exitosos. Las capturas del login en 1920x1080, 1366x768 y 1280x720 no mostraron cortes; los módulos autenticados y la navegación manual por teclado siguen requiriendo prueba humana.

## AUD-022

- Fecha: 2026-08-11
- Problema/severidad: ALTA; el arnés de actualización podía heredar variables de entorno y apuntar a una base distinta de la declarada.
- Archivos: `scripts/auditUpdater.js`, `prepareUpdate.js`, `restoreUpdateBackup.js`, `migrate.js`, `checkIntegrity.js`, `packaging/actualizar.ps1`.
- Solución: el reemplazo de variables exige `POS_ENV_OVERRIDE=1` y cada fase aborta si `DB_NAME` no coincide con `EXPECTED_UPDATE_DATABASE`.
- Prueba: actualización y rollback repetidos sobre `posaguacates_test`; comprobación final de 13 invariantes, además de diagnóstico de solo lectura sobre `posaguacates`.
- Resultado: pruebas aisladas exitosas y 13/13 invariantes operativas en cero. Se conserva el registro transparente del incidente en AUD-019.

## AUD-023

- Fecha: 2026-08-11
- Problema/severidad: ALTA de despliegue; no existía un ejecutable reciente que contuviera el actualizador corregido.
- Archivos: `packaging/build-release.ps1`, `packaging/POSAguacates.iss` y payload de distribución.
- Solución: compilación reproducible con staging inmutable y nombre inequívoco `PRUEBA`.
- Prueba: compilación real con Inno Setup 6.7.3 y verificación de metadatos/SHA-256.
- Resultado: `POS-HASS-Offline-Setup-1.1.7-PRUEBA.exe`, 127289315 bytes, SHA-256 `2493D10514475930F1E49B39E9A3DF87A2D74F75E59DD32F47FBD2C41E47D6F8`. No está firmado y no es el instalador final.

## AUD-024

- Fecha: 2026-08-11
- Problema/severidad: CRÍTICA/BLOQUEANTE; `POS-HASS-Offline-Setup-1.1.7-PRUEBA.exe` abortaba antes de mostrar el asistente con `An attempt was made to expand the "app" constant before it was initialized`.
- Archivo/línea: `packaging/POSAguacates.iss`, anterior línea 45, dentro de `InitializeWizard`.
- Causa: `InitializeWizard` se ejecuta antes de que Inno Setup inicialice la constante de directorio `{app}`; la detección de una instalación previa intentaba expandirla prematuramente.
- Solución: `FindExistingInstall` consulta `InstallLocation` en la clave de desinstalación del `AppId` real, primero en HKLM64 y luego HKLM32, y valida la presencia de `app\pos-backend\.env`. Los usos normales de `{app}` en `[Files]`, `[Run]` y `[UninstallRun]` permanecen sin cambios.
- Prevención: `packaging/check-inno-lifecycle.ps1` hace fallar el build si `InitializeSetup` o `InitializeWizard` contienen directamente `{app}`. El build lo ejecuta antes de ISCC. Limitación documentada: el análisis por expresiones regulares no demuestra llamadas indirectas y estas requieren revisión del código Pascal.
- Pruebas: verificador preventivo; compilación Inno Setup 6.7.3; inspección del `.iss`; suite 102/102; migraciones 4/4; `security:check`; `git diff --check`; archivos obligatorios/prohibidos del payload.
- Resultado: compilación comprobada de `POS-HASS-Offline-Setup-1.1.8-PRUEBA.exe`, 127286270 bytes, SHA-256 `FD8676D0EBF17CDA6CFD586A20EF8F585969D0F7DBC0974620EB64E591963146`. El usuario confirmó posteriormente que el asistente abre y que la instalación termina correctamente en otra computadora Windows. No es instalador final.

## AUD-025

- Fecha: 2026-08-11
- Problema/severidad: ALTA de operación; `papel_mm` se guardaba como 58/80 mm, pero el HTML del ticket usaba siempre cuerpo fijo de 72 mm, margen de 5 mm y tamaños fijos. En una impresora real el texto quedó cortado.
- Archivos: `routes/tickets.js`, `routes/configuracion.js`, `lib/ticketConfig.js`, frontend de Configuración, migración 012.
- Solución: el ancho configurado controla ahora `@page` y el cuerpo imprimible. Se agregaron escala de texto, margen, mostrar/ocultar logo, alto contraste y ancho del logo, con valores acotados y defaults seguros.
- Prueba: 2/2 unitarias y E2E HTTP real con papel 58 mm, texto 80%, margen 1 mm y logo oculto; inspección del HTML generado.
- Resultado: suite 104/104, E2E completo y 13/13 invariantes exitosas. Impresión física de las nuevas opciones pendiente.

## AUD-026

- Fecha: 2026-08-11
- Tipo: mejora solicitada/regla de seguridad aceptada expresamente por el usuario.
- Archivos: `routes/usuarios.js`, frontend de Usuarios y E2E.
- Cambio: el módulo Usuarios ya no exige longitud mínima ni composición de contraseña; acepta entre 1 y 128 caracteres. Vacío continúa rechazado y bcrypt permanece activo.
- Prueba: creación, login y edición de cajero con contraseñas de un carácter dentro del E2E real.
- Resultado: exitoso. Riesgo aceptado: contraseñas cortas son más fáciles de adivinar; el limitador persistente de login continúa habilitado.

## AUD-027

- Fecha: 2026-08-11
- Tipo: empaquetado de prueba autorizado.
- Archivos: Inno Setup, actualizador y payload 1.1.9.
- Contenido: AUD-025, AUD-026 y migración aditiva 012 para las opciones de ticket.
- Pruebas: suite 104/104; controles específicos 6/6; E2E completo; 13/13 invariantes; `security:check`; guard de ciclo de vida Inno; compilación ISCC; verificación de payload; actualización aislada 001–007 → 010/011/012 conservando las trece tablas, `.env`, stock, saldo y backup anterior.
- Resultado: `POS-HASS-Offline-Setup-1.1.9-PRUEBA.exe`, 127289574 bytes, SHA-256 `6C09FB438B84055F25EDB46DB48C3EF912D9C8560D00EE2B87EC291F715FA50A`. No firmado, no final; instalación física 1.1.9 pendiente del usuario.

## AUD-028

- Fecha: 2026-08-11
- Problema/severidad: ALTA/BLOQUEANTE de actualización; la copia operativa heredada vive en `Escritorio\posaguacates\posaguacates`, no tiene registro Inno y usa estructura `pos-backend`/`pos-frontend` sin carpeta `app`. 1.1.9 la clasificaba como instalación limpia.
- Archivos: `packaging/POSAguacates.iss`, `build-release.ps1`, `migrar-legacy.ps1`.
- Solución: detección validada de las dos disposiciones heredadas bajo `{userdesktop}\posaguacates`, modo independiente de migración, backup firmado obligatorio, copia byte a byte de `.env`, migraciones/invariantes, traslado de carpetas persistentes y logo, instalación del servicio en la estructura estándar y conservación intacta de la carpeta antigua. Si el puerto 3000 sigue ocupado por el backend manual, aborta antes de promover archivos.
- Prueba: sintaxis PowerShell; compilación Pascal/Inno 6.7.3; guard de ciclo de vida; suite previa 104/104; controles específicos 6/6; inspección del payload y ausencia de `.env` empaquetado.
- Resultado: `POS-HASS-Offline-Setup-1.1.10-PRUEBA.exe`, 127291915 bytes, SHA-256 `95BFADC0BB73AFCEACF61EBD857EA4392A1475D96F20523CE675B7C622ABE0C9`. La migración heredada completa requiere validación física del usuario; no es instalador final.

## AUD-029

- Severidad: CRÍTICA / bloqueante de producción.
- Problema confirmado: la migración heredada 1.1.10 se detenía durante el respaldo previo cuando el `.env` antiguo no contenía `BACKUP_SIGNING_KEY`. Además, el instalador no declaraba accesos directos y un servicio antiguo registrado desde otra ruta podía permanecer registrado.
- Evidencia física: después de ejecutar 1.1.10 solo existían `staging` y `update-backups` en `C:\Program Files\POS Aguacates`; faltaba `app`, el servicio estaba detenido y `http://127.0.0.1:3000` no respondía.
- Causa reproducida: `prepareUpdate.js` terminó con `BACKUP_SIGNING_KEY debe contener al menos 32 caracteres` antes de promover la aplicación.
- Archivos: `packaging/migrar-legacy.ps1`, `packaging/POSAguacates.iss`, `packaging/build-release.ps1` y `packaging/actualizar.ps1`.
- Corrección: generar criptográficamente una clave de firma solo cuando falta en el entorno heredado, utilizarla para el backup previo y persistirla únicamente en el nuevo `.env`; retirar por nombre el servicio obsoleto antes de registrar WinSW; crear accesos directos de Escritorio y menú Inicio; comprobar explícitamente el código de salida del proceso de instalación para impedir falsos finales exitosos; incrementar a 1.1.11 de prueba.
- Seguridad de datos: no se elimina ni modifica la carpeta heredada; el `.env` original se copia y valida por SHA-256 antes de añadir la nueva clave; el respaldo firmado continúa siendo obligatorio antes de promover archivos o ejecutar migraciones.
- Evidencia automática: PowerShell e Inno Setup compilan sin errores; guard preventivo de ciclo de vida correcto; suite `104/104`; `security:check` correcto; `git diff --check` sin errores; payload con 7/7 archivos críticos y sin `.env` ni datos operativos fuera de dependencias.
- Artefacto: `POS-HASS-Offline-Setup-1.1.11-PRUEBA.exe`, 127287618 bytes, SHA-256 `3FE47E7D93B9CD3F8C954D30D5EC56562D370FEF2808554BAB3F581F26800CA0`, no firmado y no final.
- Estado: corregido en código y pendiente de validación física de la nueva versión de prueba.

## AUD-030

- Tipo: liberación estable autorizada por el usuario.
- Alcance: convertir la versión físicamente validada 1.1.11 de prueba en instalador estable, conservando el mismo `AppId` y los caminos de instalación limpia, actualización registrada y migración heredada.
- Editor informativo: `Yahir Arceo` en los metadatos de versión. Esto no constituye una firma Authenticode.
- Verificaciones: suite `104/104`; `security:check` correcto; guard preventivo del ciclo de vida de Inno correcto; PowerShell e Inno Setup compilaron; `git diff --check` sin errores; distribución 10/10 archivos críticos, sin `.env` ni datos operativos.
- Artefacto: `POS-HASS-Offline-Setup-1.1.11.exe`, 127295273 bytes, SHA-256 `CC448FEB1B5D416AD1E08CE1867A38EE780FD5C194547DED1C8D25F4A20E0ECF`.
- Firma: `NotSigned`. Windows puede mostrar “Editor desconocido” o una advertencia de SmartScreen.
- Estado: compilación final completada; la instalación limpia y las actualizaciones en cada equipo siguen sujetas a respaldo y verificación posterior de datos.
