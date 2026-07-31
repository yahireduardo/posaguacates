# Solución de problemas

- `CREATE command denied`: use una cuenta DDL solo para `db:migrate`; no amplíe `pos_app` permanentemente.
- `npm.ps1 ... disabled`: use `npm.cmd` o una consola CMD.
- `/health` 503: confirme servicio MariaDB y variables `DB_*` sin imprimir contraseñas.
- Puerto ocupado: identifique el PID; no arranque múltiples servidores.
- Pantalla sin datos tras actualizar: aplique migraciones y recargue sesión.
- Restauración fallida: no reintente a ciegas; revise auditoría y respaldo de emergencia.
