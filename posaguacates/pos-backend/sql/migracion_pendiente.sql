-- MIGRACION PENDIENTE: no se ejecuta automaticamente y no elimina datos.
-- Compatible con MySQL 8.0.29+ por ADD COLUMN IF NOT EXISTS.
-- En MariaDB/MySQL anteriores, revisar cada columna con information_schema antes de ejecutar.

ALTER TABLE pagos
  ADD COLUMN IF NOT EXISTS tipo_movimiento ENUM('ABONO','PAGO') NOT NULL DEFAULT 'ABONO' AFTER monto,
  ADD COLUMN IF NOT EXISTS saldo_restante DECIMAL(12,2) NULL AFTER tipo_movimiento,
  ADD COLUMN IF NOT EXISTS usuario_id INT(11) NULL AFTER metodo_pago;

-- REVISION MANUAL: comprobar primero que no existan usuario_id huerfanos.
-- SELECT p.usuario_id FROM pagos p LEFT JOIN usuarios u ON u.id=p.usuario_id
-- WHERE p.usuario_id IS NOT NULL AND u.id IS NULL;
-- ALTER TABLE pagos ADD CONSTRAINT fk_pagos_usuario
--   FOREIGN KEY (usuario_id) REFERENCES usuarios(id);

-- El volcado actual ya declara estos indices. Antes de crearlos en otra base,
-- ejecutar las consultas de duplicados incluidas en diagnostico.sql.
-- CREATE UNIQUE INDEX ux_clientes_rfc ON clientes (rfc);
-- CREATE UNIQUE INDEX ux_cuentas_venta ON cuentas_por_cobrar (venta_id);

-- No ejecutar automaticamente:
-- ALTER TABLE usuarios DROP COLUMN password;
-- Solo procede tras confirmar que todos los usuarios tienen password_hash valido.

