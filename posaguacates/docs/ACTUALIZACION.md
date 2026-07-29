# Actualización del POS

1. Informe a los usuarios y cierre operaciones.
2. Genere y verifique un respaldo de MariaDB.
3. Copie la versión actual del proyecto a una carpeta de recuperación.
4. Revise el diff y las migraciones de la nueva versión.
5. Detenga el servicio:

```powershell
nssm stop POSAguacates
```

6. Actualice los archivos, preserve `.env` y ejecute `npm ci`.
7. Ejecute `npm test`.
8. Aplique únicamente migraciones aprobadas, en orden y con respaldo.
9. Inicie el servicio con `nssm start POSAguacates`.
10. Pruebe login, venta de contado, consulta de clientes, cartera e inventario.

Si falla, detenga el servicio, restaure los archivos anteriores y, si el esquema cambió, siga el rollback documentado o restaure el respaldo. No haga actualizaciones directamente durante horario de venta.
