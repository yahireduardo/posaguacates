-- Migración aditiva e idempotente del POS funcional.
-- Reversión: las columnas/tablas nuevas pueden ignorarse; no se incluyen operaciones destructivas.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(100) NOT NULL PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  checksum_sha256 CHAR(64) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS proveedores (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(180) NOT NULL,
  contacto VARCHAR(150) NULL,
  telefono VARCHAR(30) NULL,
  correo VARCHAR(180) NULL,
  direccion VARCHAR(500) NULL,
  rfc VARCHAR(13) NULL,
  notas VARCHAR(1000) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_proveedores_rfc (rfc),
  KEY ix_proveedores_nombre_activo (nombre, activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS descripcion VARCHAR(500) NULL AFTER nombre,
  ADD COLUMN IF NOT EXISTS costo DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER descripcion,
  ADD COLUMN IF NOT EXISTS proveedor_id INT NULL AFTER kilos_por_caja,
  ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER creado_en;

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS direccion VARCHAR(500) NULL AFTER telefono,
  ADD COLUMN IF NOT EXISTS notas VARCHAR(1000) NULL AFTER correo_electronico,
  ADD COLUMN IF NOT EXISTS permite_credito TINYINT(1) NOT NULL DEFAULT 1 AFTER notas,
  ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER creado_en;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS referencia_pago VARCHAR(100) NULL AFTER metodo_pago,
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(80) NULL AFTER referencia_pago;

ALTER TABLE compras
  ADD COLUMN IF NOT EXISTS proveedor_id INT NULL AFTER id,
  ADD COLUMN IF NOT EXISTS folio VARCHAR(60) NULL AFTER proveedor_id,
  ADD COLUMN IF NOT EXISTS referencia VARCHAR(100) NULL AFTER folio,
  ADD COLUMN IF NOT EXISTS observaciones VARCHAR(1000) NULL AFTER referencia,
  ADD COLUMN IF NOT EXISTS estado ENUM('ACTIVA','CANCELADA') NOT NULL DEFAULT 'ACTIVA' AFTER total,
  ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER estado,
  ADD COLUMN IF NOT EXISTS cancelada_por INT NULL AFTER usuario_id,
  ADD COLUMN IF NOT EXISTS cancelada_at DATETIME NULL AFTER cancelada_por,
  ADD COLUMN IF NOT EXISTS motivo_cancelacion VARCHAR(255) NULL AFTER cancelada_at,
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(80) NULL AFTER motivo_cancelacion;

ALTER TABLE detalle_compra
  ADD COLUMN IF NOT EXISTS unidad VARCHAR(20) NULL AFTER cantidad,
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) NULL AFTER precio_compra;

ALTER TABLE movimientos_inventario
  MODIFY COLUMN tipo ENUM('ENTRADA','SALIDA','AJUSTE') NOT NULL,
  ADD COLUMN IF NOT EXISTS stock_anterior DECIMAL(12,2) NULL AFTER cantidad,
  ADD COLUMN IF NOT EXISTS stock_final DECIMAL(12,2) NULL AFTER stock_anterior,
  ADD COLUMN IF NOT EXISTS referencia_tipo VARCHAR(40) NULL AFTER motivo;

CREATE TABLE IF NOT EXISTS configuracion_negocio (
  id TINYINT NOT NULL PRIMARY KEY DEFAULT 1,
  nombre_comercial VARCHAR(180) NOT NULL DEFAULT 'POS Aguacates Hass',
  razon_social VARCHAR(180) NULL,
  direccion VARCHAR(500) NULL,
  telefono VARCHAR(30) NULL,
  rfc VARCHAR(13) NULL,
  logo VARCHAR(255) NULL,
  mensaje_ticket VARCHAR(500) NULL,
  moneda CHAR(3) NOT NULL DEFAULT 'MXN',
  papel_mm SMALLINT NOT NULL DEFAULT 80,
  stock_minimo_default DECIMAL(12,2) NOT NULL DEFAULT 0,
  politica_credito VARCHAR(500) NULL,
  vencimiento_dias SMALLINT NOT NULL DEFAULT 30,
  actualizado_por INT NULL,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_configuracion_unica CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO configuracion_negocio (id) VALUES (1);

CREATE TABLE IF NOT EXISTS auditoria_operaciones (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  accion VARCHAR(80) NOT NULL,
  entidad VARCHAR(80) NOT NULL,
  entidad_id VARCHAR(80) NULL,
  motivo VARCHAR(500) NULL,
  datos_json LONGTEXT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_auditoria_operacion_fecha (accion, fecha),
  KEY ix_auditoria_entidad (entidad, entidad_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ventas_idempotency ON ventas (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_compras_folio ON compras (folio);
CREATE UNIQUE INDEX IF NOT EXISTS ux_compras_idempotency ON compras (idempotency_key);
CREATE INDEX IF NOT EXISTS ix_compras_proveedor_fecha ON compras (proveedor_id, fecha);
CREATE INDEX IF NOT EXISTS ix_movimientos_tipo_fecha ON movimientos_inventario (tipo, fecha);
