USE `posaguacates`;

-- Migración no destructiva. Revisar y respaldar antes de ejecutarla.
ALTER TABLE `pagos`
  ADD COLUMN IF NOT EXISTS `estado`
    ENUM('ACTIVO','CANCELADO') NOT NULL DEFAULT 'ACTIVO' AFTER `fecha`,
  ADD COLUMN IF NOT EXISTS `cancelado_por`
    INT(11) NULL AFTER `estado`,
  ADD COLUMN IF NOT EXISTS `cancelado_at`
    DATETIME NULL AFTER `cancelado_por`,
  ADD COLUMN IF NOT EXISTS `motivo_cancelacion`
    VARCHAR(255) NULL AFTER `cancelado_at`;

ALTER TABLE `movimientos_cartera`
  MODIFY COLUMN `concepto`
    ENUM(
      'VENTA_MOSTRADOR',
      'VENTA_CREDITO',
      'COBRO',
      'COBRO_MOSTRADOR',
      'CANCELACION',
      'CANCELACION_PAGO',
      'AJUSTE'
    ) NOT NULL;

SET @existe_fk_pago_cancelado_por = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'pagos'
    AND CONSTRAINT_NAME = 'fk_pagos_cancelado_por'
);

SET @sql_fk_pago_cancelado_por = IF(
  @existe_fk_pago_cancelado_por = 0,
  'ALTER TABLE pagos ADD CONSTRAINT fk_pagos_cancelado_por FOREIGN KEY (cancelado_por) REFERENCES usuarios(id)',
  'SELECT 1'
);

PREPARE stmt_fk_pago_cancelado_por FROM @sql_fk_pago_cancelado_por;
EXECUTE stmt_fk_pago_cancelado_por;
DEALLOCATE PREPARE stmt_fk_pago_cancelado_por;
