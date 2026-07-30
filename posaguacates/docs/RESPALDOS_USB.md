# Respaldos locales y en USB

Ejecute los comandos desde:

```powershell
cd C:\Users\Usuario\Desktop\posaguacates\posaguacates\pos-backend
```

## Respaldo local

```powershell
npm run db:backup
```

Se genera un `.sql` y un `.sha256` en `pos-backend\backups`. Esta carpeta está
ignorada por Git. El respaldo incluye estructura, datos, índices, llaves,
triggers, eventos y rutinas.

## Copia a USB

Conecte la unidad, confirme su letra en el Explorador y ejecute:

```powershell
npm run db:backup -- -Destino "E:\RESPALDOS_POS"
```

El script:

1. valida la unidad;
2. genera primero una copia local;
3. ejecuta `mariadb-dump` o `mysqldump`;
4. comprueba tamaño y presencia de estructura SQL;
5. genera SHA-256;
6. copia SQL y hash al USB;
7. vuelve a comparar el hash.

No retire el USB hasta que aparezca `RESPALDO VERIFICADO`. La contraseña se lee
del `.env` local, se pasa al subproceso mediante una variable temporal y no se
imprime ni queda en argumentos.

## Errores

- Unidad inexistente: corrija la letra; no se genera una falsa confirmación.
- Credenciales incorrectas: el dump termina con error y no se declara éxito.
- Falta de espacio: el proceso o la copia fallan; conserve el respaldo local.
- Hash distinto: no use esa copia y repita el respaldo con otro USB.

## Automatización diaria

Pruebe primero:

```powershell
npm run db:backup:auto
```

En el Programador de tareas de Windows cree una tarea diaria:

- Programa: `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`
- Argumentos:
  `-ExecutionPolicy Bypass -File "C:\Users\Usuario\Desktop\posaguacates\posaguacates\pos-backend\scripts\backup\backup-automatico.ps1"`
- Iniciar en:
  `C:\Users\Usuario\Desktop\posaguacates\posaguacates\pos-backend`

Configure “Ejecutar tanto si el usuario inició sesión como si no” y “Ejecutar lo
antes posible si se omite”. El script conserva los últimos 30 respaldos diarios
y 12 copias dominicales. La retención solo se ejecuta después de crear un
respaldo válido.

Revise semanalmente la carpeta y pruebe periódicamente una restauración en una
computadora separada.
