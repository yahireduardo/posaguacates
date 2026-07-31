# POS Aguacates

## Respaldo y traslado de datos

El sistema incluye una pantalla administrativa, exportación ZIP, análisis, restauración reforzada, respaldo previo, auditoría y estados `ACTIVA`/`ENTREGADA`. Solo `ADMON_GRAL` puede ejecutar acciones de `/backups`; cualquier sesión autenticada puede consultar el estado para respetar el bloqueo de la instalación.

Antes de habilitarlo aplique la migración idempotente `pos-backend/sql/migracion_respaldo_traslado.sql` y configure únicamente el `.env` local. Consulte [docs/RESPALDO_Y_TRASLADO_USB.md](docs/RESPALDO_Y_TRASLADO_USB.md).
