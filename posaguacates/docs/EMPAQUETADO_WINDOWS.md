# Empaquetado para Windows

El paquete no contiene `.env`, contraseñas, respaldos, logs, `instance-id` ni una base con datos comerciales. El instalador oficial de MariaDB se incorpora como prerrequisito offline y solo se ejecuta cuando MariaDB no está instalado.

## Construcción

1. Coloque `WinSW-x64.exe` en `packaging/vendor/WinSW-x64.exe` y el MSI oficial de MariaDB 12.3.2 en `packaging/vendor/mariadb-12.3.2-winx64.msi`.
2. Instale Inno Setup para producir el instalador EXE único.
3. Desde la raíz ejecute `npm.cmd --prefix pos-backend run package:windows`.
4. Para compilar el instalador ejecute `powershell -ExecutionPolicy Bypass -File packaging/build-release.ps1 -CompileInstaller`.

El resultado es `dist/POS-HASS-Offline-Setup-1.1.0.exe`. La compilación incorpora MariaDB, un runtime privado de Node, dependencias, servicio y frontend; el usuario final no necesita Internet, Node.js, npm, VS Code ni XAMPP.

El instalador no está firmado digitalmente. Windows puede mostrar una advertencia de editor desconocido; para distribución comercial se recomienda adquirir un certificado de firma de código y firmar el EXE antes de entregarlo.

## Primera instalación

Ejecute el instalador como administrador. El asistente solicita las credenciales administrativas de MariaDB solo durante la configuración, crea una base limpia, el usuario exclusivo `pos_app`, las tablas, migraciones, el primer administrador del POS y un `.env` local. Después instala el servicio y crea el acceso directo.

Mantenga `ALLOW_DESTRUCTIVE_TEST_DELETES=false` para datos reales.
