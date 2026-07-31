# Pruebas

`npm test` ejecuta unitarias y regresión con mocks. `npm run test:integration` se niega a iniciar salvo `NODE_ENV=test`, `TEST_DATABASE=true` y `DB_NAME` terminado en `_test`. Copie `.env.test.example` como `.env.test` y use credenciales exclusivas.

Recorrido manual: login/recarga/logout; alta y baja lógica; entrada/ajuste; compra y cancelación; venta contado/crédito y doble clic; orden y conversión; abonos parcial/total/excesivo; cancelaciones; tickets; dashboard/CSV; consultas/predicción; ZIP/análisis/ENTREGADA/reactivación; restauración y rollback solo en prueba.

## Validación automatizada del 31-07-2026

- 52 pruebas unitarias aprobadas.
- Recorrido HTTP transaccional aprobado en `posaguacates_test`.
- Exportación ZIP, manifiesto, SHA-256, análisis y restauración real aprobados en prueba.
- Fallo controlado con recuperación de emergencia, marcador preservado y auditoría `RECUPERADO`.
- ENTREGADA devolvió 423 para escrituras, permitió consultas y la reactivación restableció operaciones.
