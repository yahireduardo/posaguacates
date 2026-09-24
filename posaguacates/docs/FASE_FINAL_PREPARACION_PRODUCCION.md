# FASE FINAL DE PREPARACIÓN PARA PRODUCCIÓN

Fecha: 2026-08-11. Categorías: ✅ PROBADO, 🟡 REVISADO PERO NO EJECUTADO, ❌ FALLÓ, ❓ NO COMPROBABLE EN ESTE ENTORNO.

## Estado inicial

- Código: 88/100
- Producción: 64/100
- Confianza: 87%

## Cambios realizados

- Actualizador separado de la instalación limpia, con preflight, backup firmado obligatorio, staging, migraciones pendientes, invariantes, health check y recuperación ante fallo.
- Preservación byte a byte de `.env`; no se regeneran secretos al actualizar. Se conservan logo, respaldos y datos.
- Sesiones persistentes y revocables; logout invalida el `sid` en MariaDB.
- Limitación persistente de login por combinación IP+usuario.
- Idempotencia y locks ordenados para movimientos manuales de inventario.
- Nombres accesibles y semántica ARIA básica para formularios/modales.
- Aislamiento reforzado de los scripts de auditoría mediante base esperada obligatoria.

## Tests agregados

- Persistencia de sesión/logout y fuerza bruta tras reiniciar el listener HTTP.
- Repetición idempotente y concurrencia de ajustes sobre el mismo producto.
- Dos pruebas estáticas de accesibilidad.
- Actualización 001–007 → 010/011 con trece tablas y fallo inducido para rollback.

## Tests totales

- ✅ PROBADO: 102/102 pruebas unitarias.
- ✅ PROBADO: E2E integral en base temporal.
- ✅ PROBADO: 13/13 invariantes sin anomalías después del E2E.
- ✅ PROBADO: 13/13 invariantes de solo lectura sin anomalías en la base operativa al cierre.

## Bugs encontrados

- AUD-015: JWT seguía válido después de logout.
- AUD-016: limitador de login se perdía al reiniciar.
- AUD-017: ajuste manual duplicable y deadlock por orden de locks.
- AUD-018: staging frágil por ACL y recorrido accidental de temporales.
- AUD-019/AUD-022: herencia peligrosa de variables de entorno en el arnés.
- AUD-020: ausencia de actualizador recuperable.
- AUD-021: controles sin nombre accesible y modales sin semántica.

## Bugs corregidos

Todos los anteriores fueron corregidos y tienen prueba de regresión. Durante la primera ejecución del arnés, las migraciones aditivas 010/011 alcanzaron `posaguacates`; no hubo pruebas destructivas ni pérdida de filas. No se intentó revertir DDL de manera destructiva. El diagnóstico final de solo lectura dio trece invariantes en cero.

## Actualizador

- ✅ PROBADO en instalación simulada aislada: detecta instalación previa, valida BD, exige backup HMAC verificable, copia a staging, aplica solo migraciones pendientes y verifica integridad.
- ✅ PROBADO: `.env` conservó exactamente su SHA-256; también sobrevivieron respaldo previo, conteos, hashes, stock y saldo.
- ✅ PROBADO: un fallo inducido tras migrar restauró archivos y datos anteriores.
- Limitación: el rollback de SQL restaura datos, pero las tablas/columnas aditivas nuevas pueden permanecer. Son compatibles con la versión anterior; no existe rollback DDL destructivo automático.

## Instalación limpia

- ✅ PROBADO a nivel de esquema/backend: base limpia, migraciones y recorrido funcional HTTP.
- ✅ COMPILACIÓN COMPROBADA: se compiló un `.exe` Windows de prueba real, no final.
- ❌ EJECUCIÓN FÍSICA FALLÓ: la versión 1.1.7 abortó antes del asistente por expansión prematura de `{app}`. Esto bloquea producción y no se confunde con una compilación exitosa.
- ✅ COMPILACIÓN DE CORRECCIÓN COMPROBADA: se generó `POS-HASS-Offline-Setup-1.1.8-PRUEBA.exe`; la repetición física de la Prueba 1 sigue pendiente.

## Actualización

- ✅ PROBADO: escenario anterior con productos, clientes, ventas, detalles, inventario, movimientos, CxC, pagos/aplicaciones, proveedores, compras, usuarios y configuración. Antes/después fueron idénticos para las columnas anteriores.
- ✅ PROBADO: actualizador PowerShell real sobre carpeta simulada y MariaDB temporal.
- ❓ NO COMPROBABLE: ejecutar el `.exe` encima de una instalación real dentro de una VM desechable.

## Reinstalación

- 🟡 REVISADO PERO NO EJECUTADO: Inno detecta la instalación existente y enruta a `actualizar.ps1`; no ejecuta la configuración limpia.
- ❓ NO COMPROBABLE: reinstalación real por falta de VM Windows aislada.

## Desinstalación

- 🟡 REVISADO PERO NO EJECUTADO: elimina servicio y archivos instalados por Inno. Como la BD MariaDB es externa al directorio de aplicación, el script no la elimina.
- Riesgo: un `.env`, logo o respaldo ubicado dentro de `{app}` podría formar parte del árbol eliminado. Antes de producción debe probarse la desinstalación y documentar/cambiar la ubicación persistente si procede.

## Backup

- ✅ PROBADO: dump real, ZIP, hash, HMAC, manipulación rechazada y restauración física completa en BD temporal.
- `BACKUP_SIGNING_KEY` es indispensable para verificar respaldos existentes.

Clasificación de secretos:

| Secreto | Origen | Persistente | Transferible | Pérdida |
|---|---|---|---|---|
| JWT_SECRET | generado/configurado | sí | sí, por canal seguro | regenerable; invalida sesiones actuales |
| BACKUP_SIGNING_KEY | generado/configurado | sí | sí, imprescindible | no regenerable sin perder verificación de backups anteriores |
| OPENAI_API_KEY | proveedor externo | si se configura | sí, con protección | regenerable/rotatable; IA externa deja de funcionar mientras falte |
| DB credentials | instalación/administrador | sí | solo si se traslada esa BD | recuperables mediante administración MariaDB; requieren actualizar `.env` |

## Recuperación otra PC

- 🟡 PROCEDIMIENTO PREPARADO: guardar backup firmado, copia cifrada de `BACKUP_SIGNING_KEY`, configuración empresarial/logo y credenciales necesarias; instalar en PC B, detener POS, colocar la clave mediante `.env`, verificar/restaurar, migrar, iniciar, comprobar login y los trece invariantes.
- ❓ NO COMPROBABLE: no hubo una segunda PC/VM para ejecutar el recorrido físico.
- Propuesta no implementada: paquete de recuperación AES-256-GCM protegido por contraseña independiente, sin secretos en texto plano. Debe guardarse fuera del equipo junto con instrucciones y hash.

## Windows

- ✅ COMPILACIÓN COMPROBADA: Inno Setup 6.7.3 generó `POS-HASS-Offline-Setup-1.1.7-PRUEBA.exe`, 127289315 bytes, SHA-256 `2493D10514475930F1E49B39E9A3DF87A2D74F75E59DD32F47FBD2C41E47D6F8`.
- ❌ EJECUCIÓN FÍSICA FALLÓ: Windows/Inno Setup abortó antes de mostrar el asistente (`{app}` no inicializado).
- 🟡 REVISADO: payload x64, Node, WinSW y MariaDB incluidos.
- ❌ FALLÓ criterio de distribución final: el ejecutable no tiene firma Authenticode.
- ❓ NO COMPROBABLE: instalación real Windows 10; instalación limpia/reinstalación del EXE en Windows 11 aislado.

## Servicios/reinicio

- ✅ PROBADO: reinicio del listener backend dentro del E2E y persistencia de revocación/fuerza bruta.
- 🟡 REVISADO: WinSW usa inicio automático retrasado y reinicio tras fallo.
- ❓ NO COMPROBABLE: reiniciar el servicio Windows real, MariaDB real o Windows sin afectar el equipo operativo; tampoco la caída física y recuperación de MariaDB.
- 🟡 REVISADO: frontend maneja fallos HTTP, pero el mensaje exacto con backend desconectado requiere prueba manual.

## Sesiones

- ✅ PROBADO: login, logout, reinicio del backend y reutilización devuelven 401.
- ✅ PROBADO: diez fallos persisten tras reinicio; el undécimo devuelve 429 y otro usuario no queda bloqueado.
- Diseño: clave IP+usuario, no bloqueo global de la empresa; un login correcto limpia su contador y la ventana expira automáticamente.

## Inventario/idempotencia

- ✅ PROBADO: la misma clave y cuerpo modifica una sola vez; reutilizar clave con otro cuerpo genera conflicto.
- ✅ PROBADO: dos entradas simultáneas distintas sobre el mismo producto cambian stock 10→12, con dos movimientos válidos y sin stock imposible.

## Impresión

- 🟡 REVISADO: la venta se confirma antes de `window.print`; fallar la impresora no forma parte de la transacción económica.
- ❓ NO COMPROBABLE: impresora física no disponible.

Checklist manual y resultado esperado:

1. Conectada/con papel: una impresión legible y venta sin cambios.
2. Apagada: aviso del sistema; venta, inventario y crédito permanecen iguales.
3. Sin papel: cola/aviso; no se crea otra venta.
4. Reimpresión: mismo folio y datos; no descuenta stock.
5. Ticket cancelado: marca/estado correcto; no revive la venta.
6. Ticket antiguo: misma fecha, productos, importes y folio históricos.
7. Varias impresiones: varias copias, una sola operación económica.
8. Cambio de impresora: seleccionar destino; sin cambio en BD.

## UX

- ✅ PROBADO parcialmente: login capturado en Chrome a 1920x1080, 1366x768 y 1280x720 sin cortes, solapes ni texto ilegible.
- 🟡 REVISADO PERO NO EJECUTADO: CSS responsivo y módulos autenticados.
- ❓ NO COMPROBABLE: recorrido visual humano completo de POS, tablas y modales autenticados.

## Accesibilidad

- ✅ PROBADO: regresiones estáticas para nombres accesibles y semántica de diálogos.
- 🟡 REVISADO: foco visible, controles HTML nativos y tamaños generales.
- ❓ NO COMPROBABLE: operación completa solo con teclado y lector de pantalla; requiere prueba humana.

## Predicción

No se cambió el algoritmo ni se introdujo ML. El backtesting continúa no comprobable con una sola semana agregable.

Antes de reevaluar se deben acumular por producto: fecha/hora, cantidad y unidad, precio, cancelaciones/devoluciones, compras, stock inicial/final, faltantes, merma, proveedor, promociones y factores de temporada. Mínimo recomendado: 26–52 semanas; preferible 12–24 meses para cubrir estacionalidad anual.

## Elementos no comprobables

- Instalación/reinstalación/desinstalación real del EXE en VM limpia.
- Windows 10 real.
- Reinicio completo de Windows, servicio POS y MariaDB.
- Recuperación física en otra computadora.
- Impresora y papel reales.
- UX autenticada completa y navegación solo teclado.
- Firma digital y reputación SmartScreen.

## Riesgos restantes

1. ALTO: instalador no firmado y no ejecutado en una VM limpia.
2. ALTO: recuperación en otra PC preparada pero no demostrada físicamente.
3. ALTO: reinicios de servicio/MariaDB/Windows no ejecutados.
4. ALTO: datos persistentes dentro de `{app}` deben validarse frente a desinstalación.
5. MEDIO: impresora física no probada.
6. MEDIO: UX autenticada y teclado no recorridos manualmente.
7. MEDIO: rollback conserva DDL aditivo compatible, no restaura un esquema byte a byte.
8. MEDIO: `npm audit` no produjo evidencia por conectividad/certificado.
9. MEDIO: predicción sin historial suficiente para demostrar valor.
10. BAJO: Windows 10 no comprobado.

## Nueva puntuación

- Calidad del código: **92/100** (antes 88). Sube por revocación persistente, idempotencia de inventario, aislamiento de BD y cuatro regresiones nuevas; no llega más alto por deuda de UX/desinstalación y rollback DDL limitado.
- Preparación para producción: **78/100** (antes 64). Sube por actualización/rollback real aislado y EXE de prueba compilado; queda limitada por ausencia de VM, firma, segunda PC, reinicios e impresora.
- Confianza: **91%** (antes 87%). Sube por 102/102, E2E, concurrencia e invariantes operativas; las comprobaciones físicas faltantes impiden una confianza mayor.

## Decisión

No existen bugs críticos conocidos en las operaciones económicas probadas y las regresiones están limpias. Sin embargo, los criterios fijados exigen instalación, recuperación y reinicios comprobados. Esos puntos no pueden inferirse del código ni de pruebas unitarias.

### ¿AUTORIZAS RECOMENDAR EL POS PARA PRODUCCIÓN?

❌ NO; todavía existen estos bloqueadores: ejecutar el EXE firmado en Windows 11 limpio (y Windows 10 si se soportará), actualizar/reinstalar/desinstalar conservando datos, reiniciar Windows/WinSW/MariaDB, recuperar en otra PC y completar el protocolo de impresora/UX/teclado.

No se generó ni se declaró ningún instalador final de producción.
