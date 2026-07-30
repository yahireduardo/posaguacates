# Instalación empresarial en Windows

El objetivo es que MariaDB y el backend arranquen como servicios de Windows. El
usuario diario solo abrirá **POS Aguacates** desde el escritorio.

## Programas que se instalan una sola vez

1. **Node.js LTS de 64 bits**, usando el instalador oficial:
   <https://nodejs.org/en/download>
2. **MariaDB Server de 64 bits**, usando el MSI oficial:
   <https://mariadb.org/download/>
3. Un envoltorio de servicio:
   - Los scripts incluidos usan **NSSM** por su configuración sencilla:
     <https://nssm.cc/download>
   - Para una política que exija un proyecto con desarrollo activo, use
     **WinSW**: <https://github.com/winsw/winsw>. Se incluye una configuración
     de ejemplo en `pos-backend\scripts\winsw`.
4. Microsoft Edge, incluido normalmente en Windows, o Google Chrome.

No se necesita Visual Studio Code ni XAMPP para la operación diaria.

## 1. Ubicación definitiva

Copie la carpeta de la aplicación, como administrador, a una ruta estable:

```text
C:\POS-Aguacates\
  pos-backend\
  pos-frontend\
  docs\
```

No instale el servicio desde Descargas, Escritorio, una unidad USB o una carpeta
sin permisos permanentes.

Abra PowerShell una sola vez:

```powershell
cd C:\POS-Aguacates\pos-backend
npm ci
```

Si no existe `package-lock.json`, use `npm install`.

## 2. MariaDB como servicio

Ejecute el MSI de MariaDB como administrador:

1. Mantenga seleccionados servidor y cliente.
2. Seleccione **Install as service**.
3. Use el nombre de servicio `MariaDB`.
4. Configure inicio automático.
5. Habilite TCP/IP en el puerto 3306.
6. Defina una contraseña administrativa fuerte y guárdela fuera del proyecto.
7. No habilite acceso remoto para `root`.

Compruebe en PowerShell como administrador:

```powershell
Get-Service MariaDB
Set-Service MariaDB -StartupType Automatic
Start-Service MariaDB
```

Si el instalador creó `MySQL` o `MySQL80`, use ese nombre en lugar de `MariaDB`.
El puerto 3306 no necesita abrirse en el Firewall porque Node y MariaDB se
comunican en la misma computadora mediante `127.0.0.1`.

## 3. Base y usuario exclusivo

Abra **MariaDB Client** desde el menú Inicio e ingrese como administrador:

```sql
CREATE DATABASE IF NOT EXISTS posaguacates
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'pos_app'@'localhost' IDENTIFIED BY 'UNA_CONTRASEÑA_REAL_Y_FUERTE';

GRANT SELECT, INSERT, UPDATE, DELETE, SHOW VIEW, TRIGGER, EVENT
  ON posaguacates.* TO 'pos_app'@'localhost';

FLUSH PRIVILEGES;
SHOW GRANTS FOR 'pos_app'@'localhost';
```

Escriba la contraseña solamente en la consola local. No edite ni guarde en Git
una copia del ejemplo SQL. El archivo de referencia es
`pos-backend\sql\crear_usuario_pos.example.sql`.

Importe después el esquema aprobado o restaure el respaldo definitivo. Las
migraciones deben aplicarse con una cuenta administrativa, no con `pos_app`.

## 4. Configuración de producción

Desde `C:\POS-Aguacates\pos-backend`:

```powershell
Copy-Item .env.production.example .env
notepad .env
```

Configure localmente:

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=pos_app
DB_PASSWORD=CONTRASEÑA_LOCAL_DEL_USUARIO_POS
DB_NAME=posaguacates
DB_CONNECT_RETRIES=60
DB_CONNECT_RETRY_MS=2000
JWT_SECRET=CLAVE_ALEATORIA_LARGA
JWT_EXPIRES_IN=8h
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
ALLOW_DESTRUCTIVE_TEST_DELETES=false
```

Genere el secreto JWT en PowerShell y péguelo únicamente en `.env`:

```powershell
$bytes = New-Object byte[] 64
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

`.env` está ignorado por Git. Restrinja sus permisos:

```powershell
icacls .env /inheritance:r
icacls .env /grant:r "SYSTEM:(R)" "Administradores:(F)"
```

Si el servicio se ejecuta con otra cuenta, concédale lectura explícitamente.

## 5. Prueba previa

Ejecute temporalmente:

```powershell
npm start
```

En otra ventana:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

Debe responder `ok: true` y `base_datos: disponible`. Detenga con `Ctrl+C`.

El backend espera a MariaDB antes de escuchar en el puerto y reintenta según
`DB_CONNECT_RETRIES` y `DB_CONNECT_RETRY_MS`.

## 6. Instalar el backend con NSSM

Descomprima NSSM, por ejemplo:

```text
C:\Tools\nssm\win64\nssm.exe
```

Abra PowerShell **como administrador**:

```powershell
cd C:\POS-Aguacates\pos-backend
npm run service:install -- -NssmPath "C:\Tools\nssm\win64\nssm.exe" -MySqlServiceName "MariaDB"
```

El script configura:

- servicio `POSAguacates`;
- inicio automático;
- reinicio si Node falla;
- espera/dependencia de MariaDB;
- directorio de trabajo correcto;
- logs rotativos;
- comprobación final de `/health`.

Verifique:

```powershell
Get-Service MariaDB,POSAguacates
Invoke-RestMethod http://localhost:3000/health
```

Para quitarlo:

```powershell
npm run service:remove -- -NssmPath "C:\Tools\nssm\win64\nssm.exe"
```

### Alternativa WinSW

Descargue WinSW desde sus lanzamientos oficiales, renombre el ejecutable como
`POSAguacates.exe`, copie y adapte
`scripts\winsw\POSAguacates.xml.example` como `POSAguacates.xml`, y ejecute como
administrador:

```powershell
.\POSAguacates.exe install
.\POSAguacates.exe start
```

No instale NSSM y WinSW simultáneamente para el mismo servicio.

## 7. Firewall y otras computadoras

En el servidor, establezca la red de Windows como **Privada** y ejecute como
administrador:

```powershell
cd C:\POS-Aguacates\pos-backend
npm run windows:firewall
```

La regla abre TCP 3000 únicamente para redes privadas. No abra 3306 ni publique
el POS directamente en Internet.

Obtenga la IP:

```powershell
ipconfig
```

Busque “Dirección IPv4”, por ejemplo `192.168.1.50`. Desde otra computadora de
la misma red abra:

```text
http://192.168.1.50:3000
```

Agregue también ese origen en `.env` y reinicie el servicio:

```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.50:3000
```

```powershell
Restart-Service POSAguacates
```

Reserve esa IP en el router para que no cambie. Para acceso desde fuera de la
empresa use una VPN administrada.

## 8. Acceso directo

Como administrador, para todos los usuarios del equipo:

```powershell
cd C:\POS-Aguacates\pos-backend
npm run windows:shortcut
```

Esto crea **POS Aguacates** en el escritorio y abre Edge en modo aplicación.
Para Chrome:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\create-shortcut.ps1 -Navegador Chrome
```

## 9. Logs y diagnóstico

NSSM registra:

```text
C:\POS-Aguacates\pos-backend\logs\servicio.log
C:\POS-Aguacates\pos-backend\logs\errores.log
```

Comandos útiles:

```powershell
Get-Service MariaDB,POSAguacates
Invoke-RestMethod http://localhost:3000/health
Get-Content C:\POS-Aguacates\pos-backend\logs\errores.log -Tail 100
Restart-Service POSAguacates
```

Mantenga los respaldos automáticos descritos en `docs\RESPALDOS_USB.md`.

## Operación diaria

El usuario final solamente:

1. enciende la computadora;
2. espera a que Windows termine de iniciar;
3. hace doble clic en **POS Aguacates**;
4. inicia sesión en el sistema.

No debe abrir XAMPP, VS Code, MariaDB Client ni PowerShell.
