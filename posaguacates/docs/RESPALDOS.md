# Respaldos y restauración

## Respaldo automático

Cree `C:\RespaldosPOS`, restrinja sus permisos y programe en el Programador de tareas una ejecución nocturna con un usuario técnico. Use un archivo de opciones de MariaDB protegido para no poner la contraseña en el comando.

Ejemplo:

```powershell
$fecha = Get-Date -Format 'yyyyMMdd-HHmmss'
& 'C:\Program Files\MariaDB 10.4\bin\mysqldump.exe' --defaults-extra-file=C:\POS\backup.cnf --single-transaction --routines --triggers posaguacates | Out-File -Encoding utf8 "C:\RespaldosPOS\posaguacates-$fecha.sql"
```

Conserve al menos 30 respaldos diarios y copie una segunda versión a un medio externo o almacenamiento empresarial cifrado. Revise periódicamente espacio disponible y logs de la tarea.

## Restauración

1. Detenga temporalmente `POSAguacates`.
2. Respalde el estado actual aunque esté dañado.
3. Cree una base de prueba y restaure primero allí.
4. Valide clientes, productos, ventas, cuentas y aplicaciones de pago.
5. Solo entonces restaure en producción durante una ventana sin usuarios.
6. Inicie el servicio y ejecute los diagnósticos SQL de solo lectura.

Nunca considere válido un respaldo que no haya sido restaurado y comprobado al menos una vez.
