-- POS Aguacates: respaldo, restauración y control de traslado.
-- Idempotente: no elimina ni modifica datos existentes.

CREATE TABLE IF NOT EXISTS control_instancia_pos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  instance_id CHAR(36) NOT NULL,
  hostname VARCHAR(255) NOT NULL,
  estado ENUM('ACTIVA','ENTREGADA','RESTAURACION_EN_PROGRESO') NOT NULL DEFAULT 'ACTIVA',
  backup_id_actual CHAR(36) NULL,
  ultimo_respaldo_generado DATETIME NULL,
  ultimo_respaldo_restaurado DATETIME NULL,
  bloqueada TINYINT(1) NOT NULL DEFAULT 0,
  motivo_bloqueo VARCHAR(500) NULL,
  schema_version VARCHAR(100) NOT NULL DEFAULT 'backup-transfer-v1',
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_control_instancia_instance_id (instance_id),
  KEY ix_control_instancia_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS historial_traslados (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  backup_id CHAR(36) NOT NULL,
  nombre_archivo VARCHAR(255) NULL,
  equipo_origen VARCHAR(255) NULL,
  equipo_destino VARCHAR(255) NULL,
  generado_por INT NULL,
  restaurado_por INT NULL,
  fecha_generacion DATETIME NULL,
  fecha_restauracion DATETIME NULL,
  ultima_venta_id INT NULL,
  estado ENUM('GENERADO','ENTREGADO','ANALIZADO','RESTAURADO','FALLIDO','RECUPERADO') NOT NULL,
  observaciones VARCHAR(1000) NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_historial_backup_id (backup_id),
  KEY ix_historial_estado_fecha (estado, creado_en),
  CONSTRAINT fk_historial_generado_por FOREIGN KEY (generado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT fk_historial_restaurado_por FOREIGN KEY (restaurado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auditoria_respaldos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT NULL,
  accion VARCHAR(50) NOT NULL,
  backup_id CHAR(36) NULL,
  nombre_archivo VARCHAR(255) NULL,
  resultado ENUM('EXITOSO','FALLIDO','RECHAZADO','RECUPERADO') NOT NULL,
  tamano_bytes BIGINT UNSIGNED NULL,
  hostname VARCHAR(255) NOT NULL,
  instance_id CHAR(36) NOT NULL,
  error_resumido VARCHAR(500) NULL,
  detalles_json JSON NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_auditoria_usuario_fecha (usuario_id, creado_en),
  KEY ix_auditoria_backup (backup_id),
  CONSTRAINT fk_auditoria_respaldos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
