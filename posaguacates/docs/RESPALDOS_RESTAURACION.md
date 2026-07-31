# Respaldos y restauración

El ZIP contiene `backup.sql` y `manifest.json` con SHA-256. Analice siempre antes de restaurar. El servicio limita tamaño, evita Zip Slip y genera un respaldo de emergencia antes de modificar la base; ante fallo intenta recuperar ese respaldo y audita el resultado.

Pruebe restauración solo en una base `_test`. El estado ENTREGADA bloquea escrituras en backend y permite consultas, exportación, análisis, restauración, historial y reactivación administrativa.
