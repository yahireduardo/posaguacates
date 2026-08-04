# Empaquetado para Windows

El paquete no contiene `.env`, contraseñas, respaldos, logs, `instance-id` ni una base con datos comerciales. MariaDB debe estar instalado y ejecutándose en la computadora destino.

## Construcción

1. Descargue `WinSW-x64.exe` desde la publicación oficial de WinSW y colóquelo en `packaging/vendor/WinSW-x64.exe`.
2. Instale Inno Setup si desea producir un único instalador EXE.
3. Desde la raíz ejecute `npm.cmd --prefix pos-backend run package:windows`.
4. Para compilar el instalador ejecute `powershell -ExecutionPolicy Bypass -File packaging/build-release.ps1 -CompileInstaller`.

El resultado es `dist/POS-Aguacates-Setup-1.0.0.exe`. La compilación incorpora un runtime privado de Node; el usuario final no necesita instalar Node.js, npm, VS Code, XAMPP ni abrir una terminal.

El instalador no está firmado digitalmente. Windows puede mostrar una advertencia de editor desconocido; para distribución comercial se recomienda adquirir un certificado de firma de código y firmar el EXE antes de entregarlo.

## Primera instalación

Ejecute el instalador como administrador. El asistente solicita las credenciales administrativas de MariaDB solo durante la configuración, crea una base limpia, el usuario exclusivo `pos_app`, las tablas, migraciones, el primer administrador del POS y un `.env` local. Después instala el servicio y crea el acceso directo.

Mantenga `ALLOW_DESTRUCTIVE_TEST_DELETES=false` para datos reales.
