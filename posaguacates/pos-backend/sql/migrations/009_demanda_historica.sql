CREATE TABLE IF NOT EXISTS demanda_historica (
  id BIGINT NOT NULL AUTO_INCREMENT,
  producto_id INT NOT NULL,
  fecha DATE NOT NULL,
  cantidad DECIMAL(12,2) NOT NULL,
  unidad VARCHAR(20) NOT NULL,
  origen VARCHAR(40) NOT NULL,
  archivo VARCHAR(255) NOT NULL,
  hoja VARCHAR(255) NOT NULL,
  clasificaciones TEXT NULL,
  clave_origen CHAR(64) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_demanda_historica_origen (clave_origen),
  KEY idx_demanda_historica_producto_fecha (producto_id,fecha),
  CONSTRAINT fk_demanda_historica_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
