-- Desglose de cobros con varios métodos de pago.
ALTER TABLE ventas
  MODIFY COLUMN metodo_pago ENUM('EFECTIVO','TRANSFERENCIA','CHEQUE','MIXTO') NULL DEFAULT NULL;

CREATE TABLE IF NOT EXISTS venta_formas_pago (
  id INT NOT NULL AUTO_INCREMENT,
  venta_id INT NOT NULL,
  metodo_pago ENUM('EFECTIVO','TRANSFERENCIA','CHEQUE') NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  referencia VARCHAR(100) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_venta_forma_metodo (venta_id,metodo_pago),
  CONSTRAINT fk_venta_forma_venta FOREIGN KEY (venta_id) REFERENCES ventas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pago_formas_pago (
  id INT NOT NULL AUTO_INCREMENT,
  pago_id INT NOT NULL,
  metodo_pago ENUM('EFECTIVO','TRANSFERENCIA','CHEQUE') NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  referencia VARCHAR(100) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pago_forma_metodo (pago_id,metodo_pago),
  CONSTRAINT fk_pago_forma_pago FOREIGN KEY (pago_id) REFERENCES pagos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO venta_formas_pago (venta_id,metodo_pago,monto,referencia)
SELECT id,COALESCE(NULLIF(metodo_pago,'MIXTO'),'EFECTIVO'),total,referencia_pago
FROM ventas WHERE tipo_pago='CONTADO'
ON DUPLICATE KEY UPDATE venta_id=VALUES(venta_id);

INSERT INTO pago_formas_pago (pago_id,metodo_pago,monto,referencia)
SELECT id,
       CASE WHEN metodo_pago IN ('TRANSFERENCIA','CHEQUE') THEN metodo_pago ELSE 'EFECTIVO' END,
       monto_total,referencia
FROM pagos WHERE monto_total IS NOT NULL AND monto_total>0
ON DUPLICATE KEY UPDATE pago_id=VALUES(pago_id);
