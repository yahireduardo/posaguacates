# EVIDENCIA DE VALIDACIÓN AUTOMATIZADA DEL EXE Y POS

Fecha: 2026-08-11. Versión evaluada: `POS-HASS-Offline-Setup-1.1.8-PRUEBA.exe`.

Categorías: ✅ PROBADO REALMENTE, 🟡 REVISADO PERO NO EJECUTADO, ❌ FALLÓ, ❓ NO COMPROBABLE EN ESTE ENTORNO.

## Alcance y regla de aislamiento

No se ejecutó el instalador sobre el host porque este equipo contiene servicios MariaDB/POSAguacates y no dispone de VM o Windows Sandbox. Las operaciones económicas, migraciones, concurrencia, fallos y restauraciones se ejecutaron en `posaguacates_test`, que fue eliminada por cada arnés. La base operativa no se utilizó para pruebas destructivas.

El hecho de que el EXE compile no acredita que abra o se instale.

## Capacidades detectadas

| Capacidad | Resultado |
|---|---|
| Sistema operativo | Windows 10 Pro 22H2, build 19045.5371 |
| Arquitectura | AMD64/x64 |
| PowerShell | 5.1.19041.5369 |
| Permisos del proceso | Usuario sin elevación administrativa |
| Windows Sandbox | No existe `WindowsSandbox.exe`; estado de feature requiere elevación |
| Hyper-V | Sin módulo, ejecutable ni VM disponible |
| Virtualización aislada utilizable | ❓ No disponible desde esta sesión |
| Inno Setup | 6.7.3, compilación real |
| MariaDB | Servicio del host activo; usado solo para bases temporales autorizadas |
| Servicio POS del host | Existe, detenido; no se modificó |
| Navegadores | Chrome y Edge instalados |
| Automatización gráfica | Chrome headless disponible; no Playwright/Puppeteer/Selenium instalados |
| Impresora física | ❓ No disponible |

## Instalador 1.1.8

- ✅ PROBADO REALMENTE: verificador preventivo del ciclo de vida de Inno.
- ✅ PROBADO REALMENTE: compilación con ISCC 6.7.3.
- ✅ PROBADO REALMENTE: formato PE (`MZ`), metadatos y payload.
- ✅ PROBADO REALMENTE: nueve archivos/componentes críticos presentes y cero artefactos prohibidos fuera de `node_modules`.
- ✅ PROBADO REALMENTE: el `.iss` usado contiene `FindExistingInstall`, consulta `InstallLocation` en HKLM64/HKLM32 y no expande `{app}` en `InitializeWizard`.
- ✅ PROBADO FÍSICAMENTE POR EL USUARIO: el EXE abre el asistente y completa la instalación en otra computadora Windows. Esta evidencia es externa, no una ejecución realizada por Codex.
- 🟡 REVISADO PERO NO EJECUTADO: Inno soporta parámetros estándar, pero no se ejecutaron `/SILENT` o `/VERYSILENT` porque instalarían servicios/MariaDB sobre el host no aislado.

Archivo: `dist/POS-HASS-Offline-Setup-1.1.8-PRUEBA.exe`  
Tamaño: 127286270 bytes  
SHA-256: `FD8676D0EBF17CDA6CFD586A20EF8F585969D0F7DBC0974620EB64E591963146`  
Firma Authenticode: no firmado.  
Estado físico: pendiente de repetir Prueba 1.

## Comandos ejecutados

```text
npm.cmd test
npm.cmd run security:check
$env:NODE_OPTIONS='--use-system-ca'; npm.cmd audit --json
powershell.exe -File packaging/check-inno-lifecycle.ps1 -ScriptPath packaging/POSAguacates.iss
npm.cmd run audit:integration
npm.cmd run audit:updater
AUDIT_FORCE_UPDATE_ROLLBACK=1 npm.cmd run audit:updater
npm.cmd run audit:performance
npm.cmd run audit:prediction
git diff --check
```

El primer `audit:integration` abortó antes de conectar por falta de credenciales heredadas; se repitió con `SOURCE_ENV_PATH` explícito. El primer `audit:updater` abortó antes de crear la base porque faltaba `AUDIT_STAGE_PATH`; se repitió apuntando al payload 1.1.8. Estos intentos fallidos no mutaron bases.

## Resultados automatizados

### Regresión y seguridad

- ✅ 102/102 pruebas automatizadas.
- ✅ `security:check`: 161 archivos versionados, sin secretos ni artefactos prohibidos.
- ✅ `npm audit`: 0 vulnerabilidades (0 info, low, moderate, high o critical) en 175 dependencias.
- ✅ `git diff --check`: sin errores.
- ✅ Migraciones: 4/4 controles; aditivas, checksum estable, base esperada y tablas InnoDB.

### E2E real sobre MariaDB temporal

- ✅ Backend iniciado en listener temporal y peticiones HTTP reales.
- ✅ Login correcto/incorrecto, logout, token revocado tras reinicio y fuerza bruta persistente.
- ✅ Productos, clientes, proveedor e inventario.
- ✅ Compra, cuenta/pago a proveedor e inventario.
- ✅ Venta contado, formas de pago, detalle, stock y ticket HTML.
- ✅ Venta a crédito, CxC, abono, saldo, aplicaciones y cancelación.
- ✅ Reporte CSV, estadísticas, chatbot local y predicción local.
- ✅ Dos ventas simultáneas de 7 contra stock 10: respuestas 201/409, una venta y stock no negativo.
- ✅ Dos pagos simultáneos: 201/409 y saldo correcto.
- ✅ Dos ajustes simultáneos e idempotencia de ajuste.
- ✅ Fallos inducidos en venta, compra, pago y cancelación: sin registros parciales.
- ✅ Dinero: centavos exactos y rechazo de 1.005.
- ✅ Fechas: 00:00:01 incluido hoy y 23:59:59 del día anterior excluido.
- ✅ 13/13 invariantes en cero al terminar.

Los mensajes `Fallo inducido auditoria` del log son parte intencional del test de rollback; el test terminó exitosamente.

### Backup, restore y actualización

- ✅ Backup real previo a la actualización, ZIP no vacío, firma HMAC y verificación.
- ✅ Actualización real del esquema 001–007 a 010/011 en BD temporal.
- ✅ Trece tablas comparadas por conteo y SHA-256 de columnas anteriores.
- ✅ Fallo inducido posterior a migración y restore real del backup.
- ✅ `.env` conservado byte a byte, respaldo anterior conservado, stock 8 y saldo 40 antes/después.
- 🟡 El rollback restaura datos y migraciones registradas; las estructuras DDL aditivas compatibles pueden permanecer.

| ELEMENTO | ANTES | DESPUÉS | CONSERVADO |
|---|---:|---:|---|
| Productos | 1 + hash control | 1 + mismo hash | ✅ |
| Clientes | 1 + hash control | 1 + mismo hash | ✅ |
| Ventas | 1 + hash control | 1 + mismo hash | ✅ |
| Detalle venta | 1 + hash control | 1 + mismo hash | ✅ |
| Movimientos | 1 + hash control | 1 + mismo hash | ✅ |
| Cuentas por cobrar | 1 + hash control | 1 + mismo hash | ✅ |
| Pagos | 1 + hash control | 1 + mismo hash | ✅ |
| Aplicaciones | 1 + hash control | 1 + mismo hash | ✅ |
| Proveedores | 1 + hash control | 1 + mismo hash | ✅ |
| Compras | 1 + hash control | 1 + mismo hash | ✅ |
| Detalle compra | 1 + hash control | 1 + mismo hash | ✅ |
| Usuarios | 1 + hash control | 1 + mismo hash | ✅ |
| Configuración | 1 + hash control | 1 + mismo hash | ✅ |
| Stock control | 8 | 8 | ✅ |
| Saldo control | 40 | 40 | ✅ |
| `.env` | hash control | mismo hash | ✅ |
| Backup anterior | presente | presente | ✅ |

Logo: 🟡 la lógica de preservación fue ejecutada en carpeta simulada, pero el arnés no publicó un hash independiente del logo en su salida.

### Rendimiento

Volumen real temporal: 10,000 productos, 10,000 ventas y 100,000 detalles.

| Operación | Tiempo |
|---|---:|
| Listado de 10,000 productos | 43.60 ms |
| Venta por PK | 1.34 ms |
| Agregado anual | 3.90 ms |
| Top productos sobre 100,000 detalles | 145.07 ms |

🟡 Son tiempos individuales; el arnés actual no calcula media/p95/máximo ni estabilidad prolongada.

### Predicción e IA

- ✅ IA local y fallback sin clave/internet: pruebas unitarias y E2E HTTP.
- ✅ Chatbot local y `/prediccion`: HTTP 200 en E2E.
- ✅ El POS principal no requiere OpenAI para operar.
- 🟡 No se bloqueó físicamente la interfaz de red; el modo sin clave evita solicitudes externas y prueba el fallback equivalente de aplicación.
- ❓ Backtesting predictivo: solo una semana disponible y cero productos evaluables; no hay métricas válidas.

## Frontend, capturas y accesibilidad

- ✅ Las pruebas estáticas verifican recursos, texto alternativo, mensajes anunciados, nombres accesibles y semántica de modales.
- ✅ En la fase anterior Chrome headless generó capturas del login a 1920×1080, 1366×768 y 1280×720 sin cortes visibles.
- 🟡 El E2E actual comprueba API y HTML de ticket, no clics reales en todos los módulos.
- ❓ No hay Playwright, Puppeteer, Selenium, axe-core o Lighthouse instalados. No se agregó una dependencia pesada.
- ❓ No se generaron nuevas capturas autenticadas en `docs/evidencia-validacion/` porque no existe una instalación aislada persistente para automatizarla sin acceder a datos operativos.
- ❓ Navegación real con teclado y contraste calculado requieren la repetición física/browser aislada.

## Servicios y reinicios

- ✅ Reinicio del listener backend dentro del E2E; revocación y limitador persistieron.
- 🟡 Configuración WinSW revisada: inicio automático/reinicio ante fallo.
- ❓ No se detuvieron MariaDB ni POSAguacates del host, porque pertenecen a la instalación compartida.
- ❓ No se reinició Windows; no existe VM recuperable y reiniciar el host interrumpiría la ejecución.

## Matriz automatizada

| PRUEBA | EJECUTADA | RESULTADO | EVIDENCIA | BLOQUEA PRODUCCIÓN |
|---|---|---|---|---|
| Corrección `{app}` | Sí, estática/build | ✅ | AUD-024 + guard + ISCC | Sí hasta ejecución física |
| EXE abre | No | ❓ | Falta VM/Sandbox; 1.1.7 falló físicamente | Sí |
| Instalación limpia EXE | No | ❓ | Host no aislado | Sí |
| Archivos del payload | Sí | ✅ | 9 críticos, 0 prohibidos | Sí |
| Servicios instalados por EXE | No | ❓ | Host no aislado | Sí |
| Health del backend instalado | No | ❓ | EXE no instalado | Sí |
| Frontend instalado/browser | Parcial | 🟡 | recursos/tests y login previo | Sí |
| Login/logout/revocación | Sí | ✅ | HTTP E2E + reinicio listener | Sí |
| Productos/clientes | Sí | ✅ | HTTP + BD temporal | Sí |
| Inventario/idempotencia | Sí | ✅ | HTTP concurrente + BD | Sí |
| Venta contado/ticket | Sí | ✅ | HTTP + HTML + BD | Sí |
| Venta crédito/pagos | Sí | ✅ | HTTP + BD + invariantes | Sí |
| Cancelaciones | Sí | ✅ | normal + rollback inducido | Sí |
| Compras/proveedores/CxP | Sí | ✅ | HTTP + BD + rollback | Sí |
| Concurrencia | Sí | ✅ | ventas/pagos/ajustes | Sí |
| Dinero/fechas | Sí | ✅ | unitarias + E2E MariaDB | Sí |
| Dashboard/reportes | Sí por API | ✅ | `/stats`, CSV, BD | Sí |
| Backup/restore | Sí | ✅ | dump/ZIP/HMAC/restore | Sí |
| Actualización/rollback | Sí, simulación fiel | ✅ | carpeta + MariaDB temporal | Sí |
| Reinstalación con EXE | No | ❓ | falta VM | Sí |
| Desinstalación | No | ❓ | falta VM | Sí |
| Reinicio MariaDB/WinSW | No en servicio real | ❓ | host protegido | Sí |
| Reinicio Windows | No | ❓ | falta VM | Sí |
| Segunda instancia/PC | Parcial | 🟡 | restore a BD/carpeta aislada, no otro SO | Sí |
| IA local/offline | Sí a nivel aplicación | ✅ | unitarias + HTTP | No |
| Resoluciones | Parcial | 🟡 | login previo en 3 viewports | Sí para flujo completo |
| Accesibilidad/teclado | Parcial | 🟡 | estática; no recorrido real | Importante |
| Rendimiento | Sí | ✅ | 10k/10k/100k | No |
| Estabilidad/memoria prolongada | No | ❓ | proceso E2E breve | Importante |
| Impresora física | No | ❓ | sin hardware | Sí si se usará |

# PRUEBAS QUE CODEX NO PUDO HACER

1. Abrir físicamente `POS-HASS-Offline-Setup-1.1.8-PRUEBA.exe` en un Windows aislado.
2. Instalar, reinstalar y desinstalar el EXE real.
3. Confirmar servicios creados, cuenta/ruta de servicio y logs postinstalación.
4. Reiniciar MariaDB/WinSW/Windows dentro de una VM.
5. Recuperar en una segunda PC o VM con sistema independiente.
6. Probar Windows 11 real; este host es Windows 10.
7. Probar impresora encendida, apagada, sin papel y reimpresión física.
8. Recorrer visualmente todos los módulos autenticados en tres resoluciones.
9. Ejecutar teclado, lector de pantalla, axe/Lighthouse y contraste dinámico.
10. Medir memoria en una sesión prolongada.

Estas pruebas no se convierten en aprobadas mediante revisión de código.

## Checklist manual mínimo restante

En una VM Windows 11 limpia:

1. Verificar SHA-256 y abrir 1.1.8; confirmar que aparece el asistente.
2. Instalar y comprobar MariaDB, WinSW, `/health`, frontend y login.
3. Reiniciar Windows y ambos servicios.
4. Ejecutar reinstalación/actualización y desinstalación con datos ficticios.
5. Restaurar el backup en una segunda VM.
6. Recorrer módulos autenticados en 1920×1080, 1366×768 y 1280×720, incluido teclado.
7. Probar la impresora física si forma parte del lanzamiento.

## Puntuación

- Calidad de código: **92/100**. Sin cambio: no hubo modificación funcional nueva después de AUD-024.
- Preparación para producción: **74/100**. Baja desde 78 porque la ejecución física 1.1.7 demostró que compilación no bastaba y 1.1.8 todavía no se ejecutó.
- Confianza: **90/100**. La lógica aislada tiene evidencia fuerte, pero la capa EXE/servicios/Windows continúa pendiente.

## RESULTADO DE VALIDACIÓN AUTOMATIZADA

1. ¿El nuevo EXE abre? ❓ NO COMPROBABLE: compiló; no hay Windows aislado.
2. ¿Se instala? ❓ NO COMPROBABLE.
3. ¿Backend inicia? ✅ COMPROBADO en E2E temporal; ❓ no desde EXE instalado.
4. ¿MariaDB inicia? ⚠️ PARCIAL: conexión/BD temporal comprobada; instalación del servicio no.
5. ¿Frontend funciona? ⚠️ PARCIAL: recursos/login previo; recorrido instalado no.
6. ¿Login funciona? ✅ COMPROBADO por HTTP real.
7. ¿Venta contado funciona? ✅ COMPROBADO.
8. ¿Venta crédito funciona? ✅ COMPROBADO.
9. ¿Inventario funciona? ✅ COMPROBADO.
10. ¿Pagos funcionan? ✅ COMPROBADO.
11. ¿Compras funcionan? ✅ COMPROBADO.
12. ¿Cancelaciones funcionan? ✅ COMPROBADO.
13. ¿Backup funciona? ✅ COMPROBADO.
14. ¿Restore funciona? ✅ COMPROBADO en MariaDB temporal.
15. ¿Actualización conserva datos? ✅ COMPROBADO en instalación simulada aislada.
16. ¿Reinstalación conserva datos? ❓ NO COMPROBABLE con EXE.
17. ¿Desinstalación conserva datos? ❓ NO COMPROBABLE.
18. ¿Reinicio de servicios funciona? ⚠️ PARCIAL: listener Node sí; WinSW/MariaDB no.
19. ¿Reinicio Windows funciona? ❓ NO COMPROBABLE.
20. ¿Recuperación en otra instancia funciona? ⚠️ PARCIAL: segunda BD/carpeta sí; otra VM no.
21. ¿IA local funciona? ✅ COMPROBADO.
22. ¿El POS funciona sin internet? ⚠️ PARCIAL: modo local/sin clave sí; NIC físicamente bloqueada no.
23. ¿Las tres resoluciones funcionan? ⚠️ PARCIAL: login sí; módulos autenticados no.
24. ¿Teclado/accesibilidad están aceptables? ⚠️ PARCIAL: controles estáticos sí; recorrido real no.
25. ¿Queda algún bug crítico? ⚠️ AUD-024 está corregido y compilado, pero permanece bloqueante hasta abrir 1.1.8 físicamente.
26. ¿Queda algún bug alto? ⚠️ No hay uno nuevo confirmado en lógica; instalación, servicios, reinstalación y desinstalación siguen sin evidencia física.
27. ¿Qué no se pudo probar? EXE/servicios en VM, reinicio Windows, segunda PC real, impresora, frontend autenticado completo, teclado/axe y estabilidad prolongada.

## Decisión

**NO-GO.** No se genera instalador final. El siguiente paso obligatorio es repetir exclusivamente la Prueba 1 con `POS-HASS-Offline-Setup-1.1.8-PRUEBA.exe` en la computadora/VM externa y aportar captura del asistente o del nuevo error.
