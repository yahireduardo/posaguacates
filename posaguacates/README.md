# POS Aguacates

Aplicación web local para ventas, órdenes, clientes, cartera, inventario, proveedores, compras, usuarios, reportes, consultas y respaldos. Funciona con Node.js, Express y MariaDB sin servicios de Internet.

## Inicio

Inventario integra existencias, movimientos, productos, proveedores y compras en una sola navegación. Consulte `docs/MANUAL_INVENTARIO.md`, `docs/MANUAL_PROVEEDORES.md` y `docs/MANUAL_COMPRAS.md` para el flujo completo.

1. Instale Node.js LTS y MariaDB 12.x.
2. En `pos-backend`, copie `.env.production.example` como `.env` y capture credenciales locales.
3. Un administrador de MariaDB ejecuta `npm run db:migrate` con una cuenta con permisos DDL.
4. Ejecute `npm start` y abra `http://127.0.0.1:3000`.

Pruebas unitarias: `npm test`. Las pruebas de integración exigen una base separada terminada en `_test`; consulte [docs/PRUEBAS.md](docs/PRUEBAS.md).

No incluye Electron, ejecutable ni instalador de escritorio.
