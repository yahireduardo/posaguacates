-- Evita cobros duplicados por doble clic, reintentos de red o retransmisiones.
ALTER TABLE pagos
  ADD COLUMN idempotency_key VARCHAR(80) NULL AFTER usuario_id,
  ADD COLUMN idempotency_fingerprint CHAR(64) NULL AFTER idempotency_key,
  ADD UNIQUE KEY uq_pagos_idempotency_key (idempotency_key);

ALTER TABLE pagos_proveedores
  ADD COLUMN idempotency_key VARCHAR(80) NULL AFTER usuario_id,
  ADD COLUMN idempotency_fingerprint CHAR(64) NULL AFTER idempotency_key,
  ADD UNIQUE KEY uq_pagos_proveedores_idempotency_key (idempotency_key);
