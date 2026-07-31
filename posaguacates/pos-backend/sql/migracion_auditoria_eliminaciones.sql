-- Migración NO destructiva. Revisar y ejecutar manualmente.
CREATE TABLE IF NOT EXISTS auditoria_eliminaciones (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  entidad VARCHAR(30) NOT NULL,
  entidad_id BIGINT UNSIGNED NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  resumen_json LONGTEXT NOT NULL,
  motivo VARCHAR(255) NOT NULL,
  ejecutado_por INT NOT NULL,
  ejecutado_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_auditoria_eliminaciones_entidad (entidad, entidad_id),
  KEY idx_auditoria_eliminaciones_fecha (ejecutado_at),
  CONSTRAINT fk_auditoria_eliminaciones_usuario
    FOREIGN KEY (ejecutado_por) REFERENCES usuarios(id),
  CONSTRAINT chk_auditoria_eliminaciones_json CHECK (JSON_VALID(resumen_json))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
