# Restaurar en otra computadora

La computadora destino necesita Node.js, el proyecto, MariaDB/MySQL y un `.env`
local correcto. Instale dependencias y mantenga el backend detenido durante la
restauración.

Desde `pos-backend`:

```powershell
npm run db:restore -- -Archivo "E:\RESPALDOS_POS\posaguacates_2026-07-30_18-30-00.sql"
```

El script:

1. comprueba existencia y tamaño;
2. valida el `.sha256` cuando está disponible;
3. exige escribir `RESTAURAR BASE`;
4. crea un respaldo previo obligatorio de la base destino;
5. crea `.maintenance` para bloquear escrituras del POS;
6. importa el SQL;
7. valida clientes, ventas, productos, pagos, stock, saldo pendiente y última venta;
8. elimina la marca de mantenimiento incluso si ocurre un error.

No restaure si el hash es incorrecto. Si el proceso falla, no continúe operando
hasta revisar el error; conserve el respaldo previo creado en `backups`.

Después:

```powershell
npm start
```

Compruebe login, clientes, última venta, inventario, cuentas y pagos. Detenga con
`Ctrl+C` si la computadora solo se usará para consulta ocasional.

No copie un respaldo antiguo sobre una base más nueva sin comparar fechas. El
script no fusiona bases: restaura una fotografía independiente.
