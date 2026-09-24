CREATE TABLE IF NOT EXISTS sesiones_usuario (
  id CHAR(36) NOT NULL PRIMARY KEY,
  usuario_id INT NOT NULL,
  creada_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_at DATETIME NOT NULL,
  revocada_at DATETIME NULL,
  ip VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  KEY ix_sesiones_usuario_estado (usuario_id, revocada_at, expira_at),
  CONSTRAINT fk_sesiones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS intentos_login (
  ip VARCHAR(45) NOT NULL,
  username VARCHAR(50) NOT NULL,
  fallos INT UNSIGNED NOT NULL DEFAULT 0,
  ventana_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bloqueado_hasta DATETIME NULL,
  actualizado_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (ip, username),
  KEY ix_intentos_bloqueado (bloqueado_hasta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE movimientos_inventario
  ADD COLUMN idempotency_key VARCHAR(80) NULL AFTER usuario_id,
  ADD COLUMN idempotency_fingerprint CHAR(64) NULL AFTER idempotency_key,
  ADD UNIQUE KEY uq_movimientos_idempotency_key (idempotency_key);
