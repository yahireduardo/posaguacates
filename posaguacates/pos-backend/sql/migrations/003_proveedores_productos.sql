-- Proveedores completos y relación muchos-a-muchos con productos.
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS razon_social VARCHAR(180) NULL AFTER nombre;

CREATE TABLE IF NOT EXISTS producto_proveedores (
  producto_id INT NOT NULL,
  proveedor_id INT NOT NULL,
  codigo_proveedor VARCHAR(80) NULL,
  costo_ultimo DECIMAL(12,2) NULL,
  ultima_compra_at DATETIME NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (producto_id, proveedor_id),
  KEY ix_producto_proveedores_proveedor (proveedor_id, activo),
  CONSTRAINT fk_producto_proveedores_producto FOREIGN KEY (producto_id) REFERENCES productos(id),
  CONSTRAINT fk_producto_proveedores_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO producto_proveedores (producto_id,proveedor_id,activo)
SELECT id,proveedor_id,1 FROM productos WHERE proveedor_id IS NOT NULL
ON DUPLICATE KEY UPDATE activo=VALUES(activo);
