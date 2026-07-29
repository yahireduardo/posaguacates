# Instalación empresarial

## Arquitectura recomendada

Use una computadora servidor dentro de la empresa. MariaDB y Node.js se ejecutan como servicios de Windows; Express sirve la API y el frontend. Las demás computadoras usan un navegador y la IP local del servidor. Electron no aporta ventajas para este POS multiusuario y complicaría la distribución y conexión central a MySQL.

## Preparar el servidor

1. Asigne al servidor una reserva DHCP o IP fija, por ejemplo `192.168.1.50`.
2. Instale MariaDB como servicio de Windows con inicio automático.
3. Cree la base `posaguacates`, importe el dump y las migraciones aprobadas.
4. Cree un usuario limitado, nunca use `root` desde la aplicación:

```sql
CREATE USER 'pos_app'@'localhost' IDENTIFIED BY 'UNA_CLAVE_SEGURA';
GRANT SELECT,INSERT,UPDATE,DELETE ON posaguacates.* TO 'pos_app'@'localhost';
FLUSH PRIVILEGES;
```

5. Instale la versión LTS de Node.js y ejecute una sola vez `npm ci` en `pos-backend`.
6. Copie `.env.example` a `.env` y configure `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `HOST=0.0.0.0`, `PORT=3000` y los orígenes autorizados.
7. Compruebe una vez con `npm start` y abra `http://localhost:3000`.

## Ejecutar Node como servicio

La opción documentada es NSSM porque es sencilla y estable en Windows:

1. Descargue NSSM desde su sitio oficial, copie `nssm.exe` a una carpeta incluida en `PATH`.
2. Abra PowerShell como Administrador dentro de `pos-backend`.
3. Ejecute:

```powershell
npm run service:install
```

El servicio `POSAguacates` quedará con inicio automático. Sus logs estarán en `pos-backend/logs`. Para retirarlo:

```powershell
npm run service:remove
```

## Red y acceso de clientes

Abra el puerto solo para la red privada:

```powershell
New-NetFirewallRule -DisplayName "POS Aguacates" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

Desde otras computadoras abra `http://192.168.1.50:3000`. Sustituya la IP por la reserva real.

Para un acceso directo en modo aplicación, use como destino:

```text
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://192.168.1.50:3000
```

En el servidor puede usar `--app=http://localhost:3000`. Nombre el acceso directo **POS Aguacates**. El usuario final solo encenderá la computadora y abrirá ese acceso; no necesita XAMPP, VS Code ni terminal.

## Verificación

- MariaDB y `POSAguacates` aparecen “En ejecución” en `services.msc`.
- `http://localhost:3000` abre en el servidor.
- La IP local abre desde otra computadora.
- Login, venta, inventario y consulta se prueban con usuarios de cada rol.
- Consulte [RESPALDOS.md](RESPALDOS.md) y [ACTUALIZACION.md](ACTUALIZACION.md).
