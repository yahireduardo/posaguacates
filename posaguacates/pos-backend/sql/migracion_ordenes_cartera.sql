-- MIGRACION MANUAL. NO HA SIDO EJECUTADA.
-- Objetivo: órdenes de venta, pagos multiaplicación y libro mayor de cartera.
-- Compatible con el dump MariaDB 10.4. Revisar diagnósticos antes de ejecutar.
-- Base objetivo confirmada por el proyecto:
USE `posaguacates`;

-- 1) Diagnóstico previo (sin information_schema porque algunos phpMyAdmin lo restringen).
SELECT VERSION() version_servidor;
SELECT venta_id,COUNT(*) repeticiones FROM `posaguacates`.`cuentas_por_cobrar`
 GROUP BY venta_id HAVING COUNT(*)>1;
SELECT p.id,p.cuenta_id FROM `posaguacates`.`pagos` p
 LEFT JOIN `posaguacates`.`cuentas_por_cobrar` c ON c.id=p.cuenta_id
 WHERE p.cuenta_id IS NULL OR c.id IS NULL;

START TRANSACTION;

CREATE TABLE IF NOT EXISTS `posaguacates`.`ordenes_venta` (
  id INT(11) NOT NULL AUTO_INCREMENT,
  folio VARCHAR(20) NOT NULL,
  cliente_id INT(11) NOT NULL,
  usuario_id INT(11) NOT NULL,
  estado ENUM('BORRADOR','PENDIENTE','CONVERTIDA','CANCELADA') NOT NULL DEFAULT 'BORRADOR',
  observaciones VARCHAR(500) NULL,
  total_estimado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  venta_id INT(11) NULL,
  creada_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizada_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  convertida_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_ordenes_folio (folio),
  UNIQUE KEY ux_ordenes_venta (venta_id),
  KEY ix_ordenes_estado_fecha (estado,creada_at),
  KEY ix_ordenes_cliente_estado (cliente_id,estado),
  KEY ix_ordenes_usuario (usuario_id),
  CONSTRAINT fk_ordenes_cliente FOREIGN KEY (cliente_id) REFERENCES `posaguacates`.`clientes`(id),
  CONSTRAINT fk_ordenes_usuario FOREIGN KEY (usuario_id) REFERENCES `posaguacates`.`usuarios`(id),
  CONSTRAINT fk_ordenes_venta FOREIGN KEY (venta_id) REFERENCES `posaguacates`.`ventas`(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- La columna ordenes_venta.observaciones se conserva por compatibilidad histórica,
-- pero la aplicación ya no la captura ni la modifica. No eliminarla automáticamente.

CREATE TABLE IF NOT EXISTS `posaguacates`.`detalle_orden_venta` (
  id INT(11) NOT NULL AUTO_INCREMENT,
  orden_id INT(11) NOT NULL,
  producto_id INT(11) NOT NULL,
  cantidad DECIMAL(12,2) NOT NULL,
  precio_estimado DECIMAL(12,2) NOT NULL,
  subtotal_estimado DECIMAL(12,2) NOT NULL,
  observaciones VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_detalle_orden_producto (orden_id,producto_id),
  KEY ix_detalle_orden_producto (producto_id),
  CONSTRAINT fk_detalle_orden FOREIGN KEY (orden_id) REFERENCES `posaguacates`.`ordenes_venta`(id),
  CONSTRAINT fk_detalle_orden_producto FOREIGN KEY (producto_id) REFERENCES `posaguacates`.`productos`(id),
  CONSTRAINT ck_detalle_orden_cantidad CHECK (cantidad > 0),
  CONSTRAINT ck_detalle_orden_importes CHECK (precio_estimado >= 0 AND subtotal_estimado >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Ampliación compatible: los campos heredados cuenta_id/monto permanecen para preservar datos.
ALTER TABLE `posaguacates`.`pagos`
  ADD COLUMN IF NOT EXISTS cliente_id INT(11) NULL AFTER id,
  ADD COLUMN IF NOT EXISTS monto_total DECIMAL(12,2) NULL AFTER monto,
  ADD COLUMN IF NOT EXISTS referencia VARCHAR(100) NULL AFTER metodo_pago,
  ADD COLUMN IF NOT EXISTS observaciones VARCHAR(500) NULL AFTER referencia,
  ADD COLUMN IF NOT EXISTS usuario_id INT(11) NULL AFTER observaciones;

CREATE INDEX IF NOT EXISTS ix_pagos_cliente_fecha ON `posaguacates`.`pagos`(cliente_id,fecha);
CREATE INDEX IF NOT EXISTS ix_pagos_usuario ON `posaguacates`.`pagos`(usuario_id);

-- Encabezados para pagos históricos válidos: no se eliminan ni se reescriben montos.
UPDATE `posaguacates`.`pagos` p
 JOIN `posaguacates`.`cuentas_por_cobrar` c ON c.id=p.cuenta_id
 SET p.cliente_id=c.cliente_id,p.monto_total=p.monto
 WHERE p.cuenta_id IS NOT NULL AND p.monto IS NOT NULL AND p.cliente_id IS NULL;

CREATE TABLE IF NOT EXISTS `posaguacates`.`aplicaciones_pago` (
  id INT(11) NOT NULL AUTO_INCREMENT,
  pago_id INT(11) NOT NULL,
  cuenta_id INT(11) NOT NULL,
  monto_aplicado DECIMAL(12,2) NOT NULL,
  saldo_anterior DECIMAL(12,2) NOT NULL,
  saldo_resultante DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_aplicacion_pago_cuenta (pago_id,cuenta_id),
  KEY ix_aplicacion_cuenta (cuenta_id),
  CONSTRAINT fk_aplicacion_pago FOREIGN KEY (pago_id) REFERENCES `posaguacates`.`pagos`(id),
  CONSTRAINT fk_aplicacion_cuenta FOREIGN KEY (cuenta_id) REFERENCES `posaguacates`.`cuentas_por_cobrar`(id),
  CONSTRAINT ck_aplicacion_importes CHECK (monto_aplicado > 0 AND saldo_anterior >= 0 AND saldo_resultante >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Migración compatible de pagos heredados. saldo_anterior es reconstruido con total_deuda
-- menos pagos previos de la misma cuenta; revisar el diagnóstico después de insertar.
INSERT INTO `posaguacates`.`aplicaciones_pago`
 (pago_id,cuenta_id,monto_aplicado,saldo_anterior,saldo_resultante)
SELECT p.id,p.cuenta_id,p.monto,
       GREATEST(0,c.total_deuda-COALESCE((SELECT SUM(p2.monto) FROM `posaguacates`.`pagos` p2
         WHERE p2.cuenta_id=p.cuenta_id AND p2.id<p.id),0)),
       GREATEST(0,c.total_deuda-COALESCE((SELECT SUM(p3.monto) FROM `posaguacates`.`pagos` p3
         WHERE p3.cuenta_id=p.cuenta_id AND p3.id<=p.id),0))
 FROM `posaguacates`.`pagos` p
 JOIN `posaguacates`.`cuentas_por_cobrar` c ON c.id=p.cuenta_id
 WHERE p.cuenta_id IS NOT NULL AND p.monto>0
   AND NOT EXISTS (SELECT 1 FROM `posaguacates`.`aplicaciones_pago` ap
     WHERE ap.pago_id=p.id AND ap.cuenta_id=p.cuenta_id);

CREATE TABLE IF NOT EXISTS `posaguacates`.`movimientos_cartera` (
  id INT(11) NOT NULL AUTO_INCREMENT,
  cliente_id INT(11) NOT NULL,
  venta_id INT(11) NULL,
  cuenta_id INT(11) NULL,
  pago_id INT(11) NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  concepto ENUM('VENTA_MOSTRADOR','VENTA_CREDITO','COBRO','COBRO_MOSTRADOR','CANCELACION','AJUSTE') NOT NULL,
  folio VARCHAR(30) NOT NULL,
  cargo DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  credito DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  saldo_resultante DECIMAL(12,2) NOT NULL,
  descripcion VARCHAR(500) NULL,
  usuario_id INT(11) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_cartera_venta_concepto (venta_id,concepto),
  UNIQUE KEY ux_cartera_pago_cuenta (pago_id,cuenta_id),
  KEY ix_cartera_cliente_fecha (cliente_id,fecha,id),
  KEY ix_cartera_cuenta (cuenta_id),
  KEY ix_cartera_usuario (usuario_id),
  CONSTRAINT fk_cartera_cliente FOREIGN KEY (cliente_id) REFERENCES `posaguacates`.`clientes`(id),
  CONSTRAINT fk_cartera_venta FOREIGN KEY (venta_id) REFERENCES `posaguacates`.`ventas`(id),
  CONSTRAINT fk_cartera_cuenta FOREIGN KEY (cuenta_id) REFERENCES `posaguacates`.`cuentas_por_cobrar`(id),
  CONSTRAINT fk_cartera_pago FOREIGN KEY (pago_id) REFERENCES `posaguacates`.`pagos`(id),
  CONSTRAINT fk_cartera_usuario FOREIGN KEY (usuario_id) REFERENCES `posaguacates`.`usuarios`(id),
  CONSTRAINT ck_cartera_importes CHECK (cargo >= 0 AND credito >= 0 AND saldo_resultante >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Libro mayor histórico: cargos de crédito y aplicaciones heredadas.
INSERT IGNORE INTO `posaguacates`.`movimientos_cartera`
 (cliente_id,venta_id,cuenta_id,fecha,concepto,folio,cargo,credito,saldo_resultante,descripcion,usuario_id)
SELECT c.cliente_id,c.venta_id,c.id,c.fecha,'VENTA_CREDITO',CONCAT('V-',LPAD(c.venta_id,8,'0')),
 c.total_deuda,0,c.total_deuda,'Venta a crédito',v.usuario_id
FROM `posaguacates`.`cuentas_por_cobrar` c
 JOIN `posaguacates`.`ventas` v ON v.id=c.venta_id;

INSERT IGNORE INTO `posaguacates`.`movimientos_cartera`
 (cliente_id,venta_id,cuenta_id,pago_id,fecha,concepto,folio,cargo,credito,saldo_resultante,descripcion,usuario_id)
SELECT c.cliente_id,c.venta_id,c.id,p.id,p.fecha,'COBRO',CONCAT('P-',LPAD(p.id,8,'0')),
 0,ap.monto_aplicado,ap.saldo_resultante,'Pago histórico migrado',p.usuario_id
FROM `posaguacates`.`aplicaciones_pago` ap
 JOIN `posaguacates`.`pagos` p ON p.id=ap.pago_id
 JOIN `posaguacates`.`cuentas_por_cobrar` c ON c.id=ap.cuenta_id;

ALTER TABLE `posaguacates`.`pagos`
  ADD CONSTRAINT fk_pagos_cliente FOREIGN KEY (cliente_id) REFERENCES `posaguacates`.`clientes`(id),
  ADD CONSTRAINT fk_pagos_usuario FOREIGN KEY (usuario_id) REFERENCES `posaguacates`.`usuarios`(id);

COMMIT;

-- Validación posterior: ejecutar sql/diagnostico_ordenes_cartera.sql.
-- Solo después de corregir filas inválidas históricas se recomienda:
-- ALTER TABLE pagos MODIFY cliente_id INT(11) NOT NULL, MODIFY monto_total DECIMAL(12,2) NOT NULL;

-- ROLLBACK MANUAL (solo si aún no existen datos nuevos):
-- ALTER TABLE pagos DROP FOREIGN KEY fk_pagos_usuario, DROP FOREIGN KEY fk_pagos_cliente;
-- DROP TABLE movimientos_cartera;
-- DROP TABLE aplicaciones_pago;
-- ALTER TABLE pagos DROP INDEX ix_pagos_usuario, DROP INDEX ix_pagos_cliente_fecha,
--   DROP COLUMN usuario_id,DROP COLUMN observaciones,DROP COLUMN referencia,
--   DROP COLUMN monto_total,DROP COLUMN cliente_id;
-- DROP TABLE detalle_orden_venta;
-- DROP TABLE ordenes_venta;
