-- Cuentas por pagar y abonos a proveedores.
CREATE TABLE IF NOT EXISTS cuentas_por_pagar_proveedores (
  id INT NOT NULL AUTO_INCREMENT,
  compra_id INT NOT NULL,
  proveedor_id INT NOT NULL,
  total_deuda DECIMAL(12,2) NOT NULL,
  saldo_pendiente DECIMAL(12,2) NOT NULL,
  estado ENUM('PENDIENTE','PAGADA','CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cuenta_proveedor_compra (compra_id),
  KEY ix_cuenta_proveedor_saldo (proveedor_id,estado,saldo_pendiente),
  CONSTRAINT fk_cuenta_proveedor_compra FOREIGN KEY (compra_id) REFERENCES compras(id),
  CONSTRAINT fk_cuenta_proveedor_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pagos_proveedores (
  id INT NOT NULL AUTO_INCREMENT,
  cuenta_id INT NOT NULL,
  proveedor_id INT NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  metodo_pago ENUM('EFECTIVO','TRANSFERENCIA','CHEQUE') NOT NULL,
  referencia VARCHAR(100) NULL,
  observaciones VARCHAR(500) NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT NOT NULL,
  estado ENUM('ACTIVO','CANCELADO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (id),
  KEY ix_pago_proveedor_cuenta (cuenta_id,estado),
  KEY ix_pago_proveedor_fecha (proveedor_id,fecha),
  CONSTRAINT fk_pago_proveedor_cuenta FOREIGN KEY (cuenta_id) REFERENCES cuentas_por_pagar_proveedores(id),
  CONSTRAINT fk_pago_proveedor_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
  CONSTRAINT fk_pago_proveedor_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO cuentas_por_pagar_proveedores
  (compra_id,proveedor_id,total_deuda,saldo_pendiente,estado,fecha)
SELECT c.id,c.proveedor_id,c.total,c.total,'PENDIENTE',c.fecha
FROM compras c
WHERE c.estado='ACTIVA'
ON DUPLICATE KEY UPDATE compra_id=VALUES(compra_id);
