# PROTOCOLO DE VALIDACIÓN FÍSICA PARA PRODUCCIÓN

Instalador evaluado: `POS-HASS-Offline-Setup-1.1.7-PRUEBA.exe`

Estado de la primera ejecución física de 1.1.7: **❌ FALLÓ — 🔴 BLOQUEANTE DE PRODUCCIÓN**. El asistente no abrió por expansión prematura de `{app}`.

Versión corregida: `POS-HASS-Offline-Setup-1.1.8-PRUEBA.exe`, SHA-256 `FD8676D0EBF17CDA6CFD586A20EF8F585969D0F7DBC0974620EB64E591963146`. El usuario confirmó que abre el asistente y completa la instalación en otra computadora Windows. Las pruebas posteriores siguen registrándose por separado.

Baseline: 102/102 tests, E2E correcto, 13/13 invariantes, código 92/100, producción 78/100, confianza 91%, AUD-001–AUD-023.

Este documento sirve para validar manualmente el instalador de prueba. No autoriza producción ni convierte este ejecutable en instalador final.

## Reglas generales

1. Use solamente datos ficticios. No use la base operativa ni información real de clientes.
2. Empiece con una VM Windows 11 limpia. Tome un snapshot llamado `ANTES_POS` antes de instalar.
3. No ejecute estas pruebas en la computadora diaria del negocio.
4. Conserve el instalador original. Su SHA-256 esperado es `2493D10514475930F1E49B39E9A3DF87A2D74F75E59DD32F47FBD2C41E47D6F8`.
Get-FileHash ".\POS-HASS-Offline-Setup-1.1.8-PRUEBA.exe" -Algorithm SHA256
5. Cree una carpeta externa, por ejemplo `C:\Evidencia-POS`, para capturas, backups y notas. No la coloque dentro de la carpeta del POS.
6. Nombre cada captura `PXX-PASO-YY-descripcion.png`, por ejemplo `P01-PASO-04-instalacion.png`.
7. Cuando se pida revisar un secreto, compare su hash; nunca copie el valor a este informe ni a una captura.
8. Si una prueba falla, deténgase cuando continuar pueda borrar datos. Anote el mensaje exacto y tome una captura completa.
9. No cambie manualmente la base de datos para conseguir que una prueba pase.
10. Para obtener el SHA-256 de un archivo, abra PowerShell y ejecute `Get-FileHash 'RUTA-DEL-ARCHIVO' -Algorithm SHA256`.

## Preparación necesaria

- Una VM o segunda PC x64 dedicada a pruebas. Recomendado: dos VMs para simular PC A y PC B.
- Windows 11 actualizado. Si se pretende soportar Windows 10, una VM adicional con Windows 10 22H2.
- Cuenta local con permisos de administrador y contraseña conocida.
- Al menos 10 GB libres, 8 GB de RAM recomendados y acceso al Administrador de servicios.
- Instalador de prueba y copia del hash esperado.
- Impresora de tickets real, controlador instalado, papel suficiente y cable USB/red.
- Datos ficticios definidos en la Prueba 7.
- Memoria USB vacía o carpeta compartida cifrada para trasladar backup y material de recuperación.
- Herramienta para capturas de Windows y un archivo de notas.
- Acceso a PowerShell como administrador.
- Contraseñas de prueba. No reutilice contraseñas reales.
- Si utilizará IA externa, una clave de prueba con límite de gasto; no es necesaria para validar las operaciones principales.

---

## PRUEBA 1 — Instalación limpia Windows 11

**OBJETIVO:** comprobar que el EXE instala el POS en Windows 11 limpio sin errores.

**REQUISITOS:** VM limpia, snapshot `ANTES_POS`, administrador, instalador y 10 GB libres.

**PASOS EXACTOS:**

1. Confirme en Configuración → Sistema → Acerca de que el sistema es Windows 11 x64. Anote edición, versión y compilación.
2. Copie el EXE a `C:\Evidencia-POS`.
3. Calcule su SHA-256 y compárelo con el indicado al inicio.
4. Si no coincide, no lo ejecute y marque la prueba como fallida.
5. Haga clic derecho → Ejecutar como administrador.
6. Acepte el aviso de Windows solamente si el nombre del archivo coincide. Es normal que esta versión de prueba indique editor desconocido porque no está firmada.
7. Complete el asistente usando valores ficticios y anote cada opción elegida.
8. Espere a que finalice. No cierre ventanas de comandos que abra el instalador.
9. Abra Aplicaciones instaladas y confirme que aparece el POS.
10. Abra `services.msc` y localice MariaDB y el servicio POS/WinSW. Anote nombre, estado y tipo de inicio.

**RESULTADO ESPERADO:** instalación completa, sin rollback ni mensajes de error; MariaDB y el servicio POS aparecen instalados e iniciados.

**QUÉ DEBO OBSERVAR:** mensajes rojos, solicitudes repetidas de credenciales, antivirus, rutas extrañas y servicios detenidos.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** hash, pantalla final del instalador, Aplicaciones instaladas y ambos servicios.

**QUÉ DATOS DEBO ANOTAR:** Windows, duración, ruta instalada, nombres/estados de servicios y mensajes mostrados.

**CRITERIO DE APROBACIÓN:** hash correcto, instalación termina una vez y ambos servicios quedan disponibles sin corrección manual.

**CRITERIO DE FALLO:** hash distinto, instalador aborta, exige componentes no incluidos o algún servicio no se instala/inicia.

**RIESGO SI FALLA:** el POS no puede desplegarse de forma reproducible.

**RESULTADO REAL:**  
[x] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:** `POS-HASS-Offline-Setup-1.1.7-PRUEBA.exe` falló antes de mostrar el asistente por `{app}` prematuro. Después de AUD-024, el usuario confirmó que `POS-HASS-Offline-Setup-1.1.8-PRUEBA.exe` abre el asistente y completa correctamente la instalación en otra computadora Windows. No volver a usar 1.1.7.

---

## PRUEBA 2 — Primera ejecución

**OBJETIVO:** comprobar configuración inicial, apertura, login y comunicación completa con MariaDB.

**REQUISITOS:** Prueba 1 aprobada y credenciales creadas durante la instalación.

**PASOS EXACTOS:**

1. Abra el acceso directo del POS.
2. Espere hasta 60 segundos en el primer inicio.
3. Confirme que aparece el login y no un listado de carpetas, error JSON o pantalla blanca.
4. Intente una vez con una contraseña incorrecta y confirme que el mensaje sea comprensible.
5. Inicie con el administrador ficticio.
6. Abra Productos, Clientes, Inventario, Ventas/POS, Créditos, Compras, Reportes y Configuración.
7. Cierre sesión y confirme que vuelve al login.
8. Use Atrás o recargue; confirme que no regresa a una pantalla protegida.

**RESULTADO ESPERADO:** login disponible, error de credenciales claro, acceso correcto, módulos cargan y logout impide reutilizar la sesión.

**QUÉ DEBO OBSERVAR:** lentitud superior a 60 segundos, errores 500/404, datos de ejemplo inesperados o consola visible.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** login, dashboard tras entrar, un módulo cargado y login después de logout.

**QUÉ DATOS DEBO ANOTAR:** tiempo de apertura, usuario/rol ficticio y cualquier mensaje.

**CRITERIO DE APROBACIÓN:** recorrido completo sin errores y token anterior inutilizable tras logout.

**CRITERIO DE FALLO:** no abre, no conecta, no permite login o una ruta sensible sigue accesible tras logout.

**RIESGO SI FALLA:** indisponibilidad o acceso no autorizado.

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

---

## PRUEBA 3 — Reinicio completo de Windows

**OBJETIVO:** confirmar que el POS se recupera sin intervención después de reiniciar la PC.

**REQUISITOS:** Pruebas 1–2 aprobadas.

**PASOS EXACTOS:** cierre el navegador; reinicie Windows desde Inicio → Reiniciar; inicie sesión; espere 90 segundos; revise ambos servicios; abra el POS; haga login; consulte Productos y Dashboard.

**RESULTADO ESPERADO:** MariaDB y POS se inician automáticamente; login y consultas funcionan.

**QUÉ DEBO OBSERVAR:** servicio detenido, inicio manual necesario o errores temporales que no se recuperan.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** Administrador de tareas con tiempo de actividad reciente, servicios iniciados y POS abierto.

**QUÉ DATOS DEBO ANOTAR:** tiempo desde login de Windows hasta POS utilizable y estado de servicios.

**CRITERIO DE APROBACIÓN:** operación normal dentro de 90 segundos sin comandos manuales.

**CRITERIO DE FALLO:** servicio no arranca o POS permanece inaccesible.

**RIESGO SI FALLA:** una interrupción eléctrica dejaría el negocio detenido.

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

---

## PRUEBA 4 — Reinicio de MariaDB

**OBJETIVO:** comprobar fallo controlado y recuperación de la BD.

**REQUISITOS:** administrador, POS abierto y ninguna venta en proceso.

**PASOS EXACTOS:** en `services.msc`, anote el nombre de MariaDB; deténgalo; intente listar Productos sin guardar operaciones; capture el mensaje; inicie MariaDB; espere 30 segundos; recargue; haga login si se solicita; consulte Productos, Clientes y Dashboard.

**RESULTADO ESPERADO:** durante la caída aparece un error comprensible y no se registra nada; al iniciar MariaDB el POS se recupera sin reinstalar.

**QUÉ DEBO OBSERVAR:** pantalla congelada, detalles de contraseña/stack trace o necesidad de reiniciar toda la PC.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** servicio detenido, mensaje del POS, servicio iniciado y consulta recuperada.

**QUÉ DATOS DEBO ANOTAR:** mensajes exactos y tiempo de recuperación.

**CRITERIO DE APROBACIÓN:** recupera consultas en 60 segundos sin pérdida ni reinstalación.

**CRITERIO DE FALLO:** no recupera, muestra secretos o crea una operación parcial.

**RIESGO SI FALLA:** interrupción prolongada o datos inciertos.

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

---

## PRUEBA 5 — Reinicio de WinSW/backend

**OBJETIVO:** comprobar recuperación independiente del backend.

**REQUISITOS:** nombre del servicio POS identificado y ninguna operación en curso.

**PASOS EXACTOS:** deje el frontend abierto; detenga el servicio POS; intente una consulta no destructiva; capture el error; inicie el servicio; espere 30 segundos; recargue; haga login; revise Productos y Clientes.

**RESULTADO ESPERADO:** el frontend informa indisponibilidad y vuelve a funcionar cuando el servicio inicia.

**QUÉ DEBO OBSERVAR:** mensaje técnico incomprensible, bucle de carga o servicio que se detiene de nuevo.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** servicio detenido, error visible, servicio iniciado y recuperación.

**QUÉ DATOS DEBO ANOTAR:** tiempo y mensajes exactos.

**CRITERIO DE APROBACIÓN:** recuperación sin reinstalación ni alteración de datos.

**CRITERIO DE FALLO:** servicio no inicia o frontend no se recupera.

**RIESGO SI FALLA:** indisponibilidad ante un fallo del proceso Node.

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

---

## PRUEBA 6 — Venta completa después del reinicio

**OBJETIVO:** comprobar operación económica completa tras los reinicios.

**REQUISITOS:** producto ficticio con stock 20 y precio conocido; cliente ficticio.

**PASOS EXACTOS:** anote stock inicial; agregue 2 unidades al carrito; seleccione cliente y contado; cobre; anote folio/total; no imprima todavía; abra historial; confirme detalle; revise stock final y Dashboard.

**RESULTADO ESPERADO:** una venta, un detalle, stock 18 y total exacto.

**QUÉ DEBO OBSERVAR:** doble registro, stock incorrecto, dinero redondeado o ticket distinto.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** carrito antes, confirmación, historial y stock final.

**QUÉ DATOS DEBO ANOTAR:** producto, stock 20→18, cantidad, precio, total, folio, fecha y hora.

**CRITERIO DE APROBACIÓN:** todos los valores coinciden y solo existe una venta.

**CRITERIO DE FALLO:** operación parcial, duplicada o stock/dinero incorrecto.

**RIESGO SI FALLA:** pérdida directa de inventario o dinero.

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

---

## PRUEBA 7 — Creación de datos para actualización

**OBJETIVO:** preparar controles que permitan demostrar conservación.

**REQUISITOS:** instalación estable y carpeta externa de evidencia.

**PASOS EXACTOS:** cree `Producto Control A` (stock 50, precio 10.99), `Producto Control B` (stock 25), `Cliente Control`, `Proveedor Control`; registre entrada de 5, compra de 4, venta contado de 2, venta a crédito de 10.00 y abono de 3.00; configure empresa `EMPRESA CONTROL QA`; cargue un logo de prueba; cree un backup firmado; copie el backup fuera de `{app}`; anote conteos visibles, folios, stock y saldo 7.00; calcule hash del backup.

**RESULTADO ESPERADO:** datos relacionados visibles y backup creado.

**QUÉ DEBO OBSERVAR:** saldos, stock y folios coherentes.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** cada ficha, historial, configuración, logo y backup.

**QUÉ DATOS DEBO ANOTAR:** IDs/folios, valores exactos, ruta y SHA-256 del backup.

**CRITERIO DE APROBACIÓN:** existe un juego de control completo y reproducible.

**CRITERIO DE FALLO:** no se puede crear o los totales iniciales ya son inconsistentes.

**RIESGO SI FALLA:** la actualización no podría validarse con evidencia.

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

---

## PRUEBA 8 — Actualización/reinstalación conservando datos

**OBJETIVO:** confirmar detección de instalación existente y conservación completa.

**REQUISITOS:** Prueba 7 aprobada, snapshot y backup externo.

**PASOS EXACTOS:** cierre POS; no desinstale; ejecute nuevamente el mismo EXE como administrador; confirme que identifica actualización/reinstalación y no pide crear empresa/secretos nuevos; finalice; abra POS; login; compare todos los controles de la Prueba 7; realice una nueva consulta y una venta ficticia pequeña.

**RESULTADO ESPERADO:** datos, IDs, folios, stock, saldo y configuración sobreviven; el sistema sigue escribiendo.

**QUÉ DEBO OBSERVAR:** asistente de instalación limpia, BD vacía, usuario rechazado o datos duplicados.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** modo detectado, final y comparación de datos.

**QUÉ DATOS DEBO ANOTAR:** duración y tabla antes/después de cada control.

**CRITERIO DE APROBACIÓN:** todos los valores anteriores sobreviven exactamente y nuevas operaciones funcionan.

**CRITERIO DE FALLO:** cualquier dato/secreto se pierde, cambia o duplica.

**RIESGO SI FALLA:** actualizaciones futuras pueden destruir la empresa.

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

---

## PRUEBA 9 — Verificación de `.env`, secretos, configuración, logo y backups

**OBJETIVO:** demostrar preservación byte a byte sin exponer secretos.

**REQUISITOS:** PowerShell y ubicación del `.env`/backup identificada.

**PASOS EXACTOS:** antes de repetir la actualización, calcule SHA-256 del `.env`, logo y backup; guarde solo hashes; actualice; calcule otra vez; compare; abra Configuración y confirme empresa/logo; compruebe que el backup anterior sigue presente; haga login con el usuario anterior.

**RESULTADO ESPERADO:** hashes del `.env`, logo y backup idénticos; configuración y usuario intactos.

**QUÉ DEBO OBSERVAR:** secretos regenerados, archivo reemplazado por ejemplo o backup eliminado.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** salida con hashes y configuración; oculte rutas/valores sensibles si es necesario.

**QUÉ DATOS DEBO ANOTAR:** tres hashes antes/después y ubicaciones.

**CRITERIO DE APROBACIÓN:** coincidencia exacta de hashes y configuración funcional.

**CRITERIO DE FALLO:** cualquier diferencia no explicada.

**RIESGO SI FALLA:** cierre de sesiones, backups irrecuperables o pérdida de identidad empresarial.

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

---

## PRUEBA 10 — Desinstalación

**OBJETIVO:** conocer exactamente qué elimina el desinstalador.

**REQUISITOS:** snapshot posterior a Prueba 9 y backup externo verificado.

**PASOS EXACTOS:** anote ruta de aplicación, servicios y ubicaciones de `.env`, logo y backups; cierre POS; desinstale desde Aplicaciones instaladas; registre todas las preguntas; no acepte opciones que digan borrar datos empresariales sin anotarlo; reinicie si lo solicita; revise carpeta y servicios.

**RESULTADO ESPERADO:** aplicación y servicio POS eliminados limpiamente; ninguna eliminación silenciosa de BD empresarial.

**QUÉ DEBO OBSERVAR:** MariaDB eliminado, carpeta completa borrada sin advertencia o servicio huérfano.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** preguntas, final, servicios y carpetas posteriores.

**QUÉ DATOS DEBO ANOTAR:** archivos/servicios eliminados y conservados.

**CRITERIO DE APROBACIÓN:** desinstalación predecible, sin borrar datos silenciosamente ni dejar servicio roto.

**CRITERIO DE FALLO:** datos empresariales eliminados sin decisión explícita o residuos impiden reinstalar.

**RIESGO SI FALLA:** pérdida total de datos o sistema no mantenible.

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

---

## PRUEBA 11 — Comportamiento de datos después de desinstalar

**OBJETIVO:** comprobar si los datos sobreviven y pueden reutilizarse conscientemente.

**REQUISITOS:** Prueba 10 y lista de controles de Prueba 7.

**PASOS EXACTOS:** confirme si el servicio/archivos de datos MariaDB permanecen; no abra ni edite archivos internos; reinstale el EXE; observe si ofrece instalación limpia o recuperación; abra POS; compare datos de control; si no reaparecen, no restaure todavía: anote que se requiere el flujo de backup.

**RESULTADO ESPERADO:** comportamiento claramente documentado y sin sobrescritura silenciosa. Preferiblemente los datos sobreviven o existe recuperación explícita.

**QUÉ DEBO OBSERVAR:** nueva BD sobrescribiendo la anterior o configuración incoherente.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** modo de reinstalación y datos/resultados posteriores.

**QUÉ DATOS DEBO ANOTAR:** qué sobrevivió y pasos necesarios para volver a operar.

**CRITERIO DE APROBACIÓN:** ningún dato es destruido silenciosamente y el resultado es recuperable/documentable.

**CRITERIO DE FALLO:** pérdida irreversible o sobrescritura sin advertencia.

**RIESGO SI FALLA:** desinstalar por mantenimiento puede destruir la empresa.

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

---

## PRUEBA 12 — Instalación en una segunda computadora/VM

**OBJETIVO:** validar un PC B limpio e independiente.

**REQUISITOS:** segunda VM x64, snapshot limpio, EXE verificado y red desconectable.

**PASOS EXACTOS:** repita Prueba 1 en PC B; use configuración ficticia temporal distinta; abra/login; compruebe servicios; confirme que PC B no contiene datos de PC A antes de restaurar.

**RESULTADO ESPERADO:** instalación limpia funcional e independiente.

**QUÉ DEBO OBSERVAR:** dependencia de rutas/usuarios de PC A o descarga faltante.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** Windows B, servicios, login y BD inicialmente vacía.

**QUÉ DATOS DEBO ANOTAR:** versión Windows, tiempos y configuración de PC B.

**CRITERIO DE APROBACIÓN:** PC B funciona sin archivos ocultos de PC A.

**CRITERIO DE FALLO:** instalador depende del primer equipo o no inicia.

**RIESGO SI FALLA:** no existe recuperación ante pérdida total del PC.

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

---

## PRUEBA 13 — Recuperación completa mediante backup

**OBJETIVO:** demostrar recuperación PC A → PC B.

**REQUISITOS:** backup firmado externo de Prueba 7, `BACKUP_SIGNING_KEY` transferida de forma segura, PC B y lista de controles.

**PASOS EXACTOS:** en PC B cierre el POS; configure de forma segura la misma `BACKUP_SIGNING_KEY` sin fotografiarla; abra el módulo de restauración; seleccione el ZIP; confirme que firma/hash son válidos; ejecute restauración; espere fin; reinicie el servicio POS; login con usuario de PC A; compare productos, clientes, ventas, inventario, crédito, pagos, compras, proveedor, configuración y logo; realice una consulta y una nueva venta ficticia; reinicie PC B y vuelva a consultar.

**RESULTADO ESPERADO:** todos los controles de PC A reaparecen exactamente y el sistema acepta nuevas operaciones.

**QUÉ DEBO OBSERVAR:** firma rechazada, usuario ausente, saldo/stock distinto o restauración parcial.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** validación del backup, final, cada grupo de datos recuperado y operación nueva.

**QUÉ DATOS DEBO ANOTAR:** hash del ZIP, duración, controles A/B y resultado tras reiniciar.

**CRITERIO DE APROBACIÓN:** recuperación completa, exacta, reiniciable y escribible.

**CRITERIO DE FALLO:** falta cualquier dato o no se puede continuar operando.

**RIESGO SI FALLA:** no existe recuperación real ante desastre.

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

---

## PRUEBA 14 — Impresora física

**OBJETIVO:** validar ticket real sin afectar dos veces la venta.

**REQUISITOS:** impresora predeterminada, papel, controlador y producto ficticio.

**PASOS EXACTOS:** imprima página de prueba de Windows; anote stock; haga una venta de una unidad; imprima una vez; compare papel con pantalla/historial; revise stock y conteo de ventas.

**RESULTADO ESPERADO:** ticket legible con folio, fecha, cliente, productos, cantidades, unitarios, subtotales y total; una venta y un descuento.

**QUÉ DEBO OBSERVAR:** texto cortado, decimales, ancho, logo y duplicación.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** ticket junto a pantalla ocultando datos sensibles.

**QUÉ DATOS DEBO ANOTAR:** modelo, conexión, ancho de papel, folio y stock antes/después.

**CRITERIO DE APROBACIÓN:** ticket correcto y sin segundo efecto económico.

**CRITERIO DE FALLO:** ticket incorrecto o impresión altera venta/inventario.

**RIESGO SI FALLA:** comprobantes incorrectos o duplicación económica.

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

---

## PRUEBA 15 — Impresora apagada

**OBJETIVO:** confirmar que una falla de impresión no cancela ni duplica la venta.

**REQUISITOS:** impresora instalada pero apagada.

**PASOS EXACTOS:** anote stock; apague impresora; haga una venta de una unidad; solicite imprimir; cierre/cancele el diálogo si corresponde; compruebe historial, folio, stock, crédito y Dashboard; encienda la impresora sin repetir la venta.

**RESULTADO ESPERADO:** venta queda registrada una vez; falla solo la impresión.

**QUÉ DEBO OBSERVAR:** reenvío automático y estado de cola.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** error/cola e historial confirmado.

**QUÉ DATOS DEBO ANOTAR:** folio, stock y conteo antes/después.

**CRITERIO DE APROBACIÓN:** una venta y un descuento pese al fallo de impresora.

**CRITERIO DE FALLO:** venta desaparece, se duplica o cambia inventario/crédito.

**RIESGO SI FALLA:** pérdida o duplicación de dinero por periférico.

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

---

## PRUEBA 16 — Impresora sin papel

**OBJETIVO:** validar separación venta/impresión ante falta de papel.

**REQUISITOS:** impresora encendida sin papel.

**PASOS EXACTOS:** repita la secuencia de Prueba 15; observe cola; coloque papel; permita reanudar el mismo trabajo sin volver a cobrar; verifique historial y stock.

**RESULTADO ESPERADO:** una sola venta; el trabajo se reanuda o puede reimprimirse conscientemente.

**QUÉ DEBO OBSERVAR:** múltiples copias inesperadas al poner papel.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** falta de papel/cola y ticket final.

**QUÉ DATOS DEBO ANOTAR:** folio, número de trabajos/copias y stock.

**CRITERIO DE APROBACIÓN:** una operación económica y ticket recuperable.

**CRITERIO DE FALLO:** operación duplicada o ticket irrecuperable sin claridad.

**RIESGO SI FALLA:** confusión de cobros y comprobantes.

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

---

## PRUEBA 17 — Reimpresión

**OBJETIVO:** comprobar que reimprimir nunca repite efectos financieros.

**REQUISITOS:** venta existente de Prueba 14–16.

**PASOS EXACTOS:** anote stock, saldo, conteos y folio; abra ticket histórico; imprima tres veces; compare las copias; vuelva a consultar los controles.

**RESULTADO ESPERADO:** tres copias idénticas del mismo folio, sin nuevas ventas, pagos ni movimientos.

**QUÉ DEBO OBSERVAR:** folio/fecha cambiados o contador económico incrementado.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** copias y controles posteriores.

**QUÉ DATOS DEBO ANOTAR:** folio, número de copias y conteos antes/después.

**CRITERIO DE APROBACIÓN:** solo aumenta el número de impresiones, no los datos económicos.

**CRITERIO DE FALLO:** cualquier cambio de stock, saldo, venta o pago.

**RIESGO SI FALLA:** duplicación contable grave.

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

---

## PRUEBAS 18, 19 y 20 — Resoluciones visuales

Ejecute este bloque tres veces:

- **PRUEBA 18:** 1920×1080, escala de Windows 100%.
- **PRUEBA 19:** 1366×768, escala recomendada por Windows y anótela.
- **PRUEBA 20:** 1280×720, escala 100% si está disponible.

**OBJETIVO:** revisar visualmente todos los módulos sin cortes ni controles inaccesibles.

**REQUISITOS:** PC/VM con resolución seleccionada y sesión con datos ficticios.

**PASOS EXACTOS:** aplique resolución; maximice navegador; use zoom 100%; recorra login, Dashboard, POS con carrito largo, Productos, Inventario, Clientes, Ventas, Créditos, Pagos, Compras, Proveedores, Tickets, Reportes, IA/Predicción y Configuración; abra formularios y modales; pruebe tablas largas y scroll; no cambie datos salvo registros ficticios.

**RESULTADO ESPERADO:** texto legible, scroll utilizable, botones/modales completos, encabezados y campos sin superposición.

**QUÉ DEBO OBSERVAR:** contenido cortado, botones fuera de pantalla, doble scroll, tablas imposibles o modales sin cerrar.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** una por cada módulo y una por cada defecto, mostrando resolución.

**QUÉ DATOS DEBO ANOTAR:** prueba 18/19/20, resolución, escala, zoom, módulo y defecto.

**CRITERIO DE APROBACIÓN:** todas las operaciones principales son visibles y accesibles sin cambiar zoom.

**CRITERIO DE FALLO:** un control necesario no puede verse/usarse o datos son ilegibles.

**RIESGO SI FALLA:** errores humanos o imposibilidad de operar en equipos comunes.

### Resultado PRUEBA 18

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

### Resultado PRUEBA 19

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

### Resultado PRUEBA 20

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

---

## PRUEBA 21 — Navegación solamente con teclado

**OBJETIVO:** confirmar que las operaciones esenciales no exigen ratón.

**REQUISITOS:** datos ficticios; desconecte el ratón o no lo use.

**PASOS EXACTOS:** desde login use `Tab`, `Shift+Tab`, flechas, `Enter`, espacio y `Esc`; observe foco; haga login; abra Productos y Clientes; abra/cierre formularios; vaya al POS; busque producto, agréguelo, cambie cantidad, seleccione cliente/pago y llegue hasta la confirmación de una venta ficticia; pruebe cancelar modal con `Esc`; cierre sesión.

**RESULTADO ESPERADO:** foco siempre visible y orden lógico; controles activables; no existe trampa de teclado.

**QUÉ DEBO OBSERVAR:** foco invisible, salto ilógico, modal que atrapa foco o botón inaccesible.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** foco en login, formulario, modal, carrito, cobro y logout.

**QUÉ DATOS DEBO ANOTAR:** tecla, pantalla, control esperado/real y pasos donde fue necesario usar ratón.

**CRITERIO DE APROBACIÓN:** login, alta/consulta y venta pueden completarse razonablemente con teclado.

**CRITERIO DE FALLO:** una operación esencial queda bloqueada o el foco desaparece.

**RIESGO SI FALLA:** accesibilidad insuficiente y operación lenta.

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

---

## PRUEBA 22 — Flujo final completo de operación

**OBJETIVO:** simular una jornada breve después de aprobar todas las pruebas anteriores.

**REQUISITOS:** PC B recuperada, servicios estables, impresora lista y datos ficticios.

**PASOS EXACTOS:** reinicie Windows; login como administrador y cree un cajero ficticio si la función existe; logout/login como cajero; consulte stock; registre entrada/compra; cree cliente; venta contado con ticket; venta a crédito; registre abono; reimprima ticket; consulte Dashboard/reportes; confirme saldos y stock; logout; reinicie servicio backend; vuelva a entrar y consulte las operaciones; genere backup final y copie fuera del equipo.

**RESULTADO ESPERADO:** flujo completo coherente, persistente y recuperable; roles respetados; ticket y backup generados.

**QUÉ DEBO OBSERVAR:** errores acumulativos, permisos excesivos, dobles clics, totales o stock incoherentes.

**QUÉ CAPTURA DE PANTALLA DEBO TOMAR:** inicio, cada operación principal, reportes finales, servicios y backup.

**QUÉ DATOS DEBO ANOTAR:** hora inicial/final, usuarios, folios, stock, ventas, deuda, abono, saldo y hash del backup.

**CRITERIO DE APROBACIÓN:** toda la cadena funciona después de reinicios, impresión y recuperación, sin inconsistencias conocidas.

**CRITERIO DE FALLO:** cualquier pérdida/duplicación de dinero o inventario, acceso indebido, indisponibilidad o backup inválido.

**RIESGO SI FALLA:** el POS no está preparado para operación diaria.

**RESULTADO REAL:**  
[ ] APROBADO  
[ ] FALLÓ  
[ ] NO REALIZADO

**OBSERVACIONES:**

---

# TABLA FINAL DE RESULTADOS

| PRUEBA | RESULTADO | BLOQUEA PRODUCCIÓN | OBSERVACIONES |
|---|---|---|---|
| 1. Instalación limpia Windows 11 | ✅ APROBADO con 1.1.8 | Sí | El usuario confirmó asistente e instalación correcta; 1.1.7 permanece fallida y obsoleta. |
| 2. Primera ejecución | | Sí | |
| 3. Reinicio completo de Windows | | Sí | |
| 4. Reinicio de MariaDB | | Sí | |
| 5. Reinicio de WinSW/backend | | Sí | |
| 6. Venta después del reinicio | | Sí | |
| 7. Datos para actualización | | Sí | |
| 8. Actualización/reinstalación | | Sí | |
| 9. `.env`, secretos, configuración, logo y backups | | Sí | |
| 10. Desinstalación | | Sí | |
| 11. Datos tras desinstalar | | Sí | |
| 12. Instalación segunda PC/VM | | Sí | |
| 13. Recuperación mediante backup | | Sí | |
| 14. Impresora física | | Sí si se usará al lanzar | |
| 15. Impresora apagada | | Sí si se usará al lanzar | |
| 16. Impresora sin papel | | Sí si se usará al lanzar | |
| 17. Reimpresión | | Sí si se usará al lanzar | |
| 18. 1920×1080 | | No, salvo que sea resolución operativa | |
| 19. 1366×768 | | Sí | |
| 20. 1280×720 | | Sí | |
| 21. Solo teclado | | No; importante | |
| 22. Flujo final completo | | Sí | |

# CRITERIO GO / NO-GO

## 🔴 BLOQUEANTE

Deben estar aprobadas antes de generar el instalador final:

- Pruebas 1–13 y 22.
- Pruebas 14–17 si el negocio utilizará impresora al momento del lanzamiento.
- Pruebas 19 y 20, porque representan pantallas comunes de operación.
- El hash del instalador debe coincidir en todas las copias.
- Ninguna prueba puede revelar pérdida, duplicación o alteración de ventas, pagos, créditos, compras, stock, usuarios, secretos o backups.
- La recuperación PC A → PC B debe terminar con login y una operación nueva correcta.
- No puede quedar ningún fallo CRÍTICO o ALTO sin diagnosticar y corregir.
- El futuro instalador final debe estar firmado digitalmente o existir una decisión formal y documentada que acepte el riesgo. Para una recomendación normal de producción, la firma es obligatoria.

Si una prueba bloqueante falla o no se realiza, la decisión es **NO-GO**.

## 🟠 IMPORTANTE

- Prueba 18 en 1920×1080.
- Prueba 21 de teclado.
- Mensajes comprensibles durante caídas de backend/MariaDB.
- Validación adicional en Windows 10 si se anunciará compatibilidad con Windows 10.
- Escaneo del EXE firmado con Microsoft Defender y verificación de SmartScreen.

Un fallo importante no se ignora: debe corregirse o documentarse con responsable, mitigación y fecha antes de GO.

## 🟡 RECOMENDABLE

- Repetir Prueba 22 durante varias horas con dos usuarios.
- Probar una segunda marca/modelo de impresora.
- Conservar snapshots `ANTES_POS`, `ANTES_ACTUALIZAR` y `ANTES_RESTAURAR`.
- Repetir recuperación trimestralmente y después de cambios de backup.
- Ejecutar las pruebas en el mismo modelo de computadora que usará el negocio.

## Decisión que debe registrarse

- **GO:** todas las pruebas bloqueantes aplicables están aprobadas, no existen defectos críticos/altos abiertos y la evidencia está guardada fuera de la PC probada.
- **NO-GO:** una prueba bloqueante falló, no se realizó, carece de evidencia o existe incertidumbre sobre datos, dinero, inventario, seguridad, recuperación o continuidad.

Hasta completar este protocolo, el POS no debe declararse listo para producción y no debe generarse el instalador final.
