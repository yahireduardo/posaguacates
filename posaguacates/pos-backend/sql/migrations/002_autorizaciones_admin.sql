-- Integra al flujo automático la tabla que antes se aplicaba manualmente.
CREATE TABLE IF NOT EXISTS autorizaciones_admin (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  accion VARCHAR(50) NOT NULL,
  recurso_tipo VARCHAR(30) NOT NULL,
  recurso_id BIGINT UNSIGNED NOT NULL,
  solicitado_por INT NOT NULL,
  autorizado_por INT NOT NULL,
  motivo VARCHAR(255) NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resultado VARCHAR(30) NOT NULL DEFAULT 'AUTORIZADA',
  PRIMARY KEY (id),
  KEY idx_autorizaciones_recurso (recurso_tipo, recurso_id),
  KEY idx_autorizaciones_fecha (fecha),
  CONSTRAINT fk_autorizaciones_solicitante
    FOREIGN KEY (solicitado_por) REFERENCES usuarios(id),
  CONSTRAINT fk_autorizaciones_autorizador
    FOREIGN KEY (autorizado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
