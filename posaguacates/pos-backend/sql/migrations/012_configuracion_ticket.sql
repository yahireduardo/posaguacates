ALTER TABLE configuracion_negocio
  ADD COLUMN IF NOT EXISTS ticket_escala_texto SMALLINT NOT NULL DEFAULT 100 AFTER papel_mm,
  ADD COLUMN IF NOT EXISTS ticket_margen_mm TINYINT UNSIGNED NOT NULL DEFAULT 2 AFTER ticket_escala_texto,
  ADD COLUMN IF NOT EXISTS ticket_mostrar_logo TINYINT(1) NOT NULL DEFAULT 1 AFTER ticket_margen_mm,
  ADD COLUMN IF NOT EXISTS ticket_logo_alto_contraste TINYINT(1) NOT NULL DEFAULT 0 AFTER ticket_mostrar_logo,
  ADD COLUMN IF NOT EXISTS ticket_logo_ancho_pct TINYINT UNSIGNED NOT NULL DEFAULT 50 AFTER ticket_logo_alto_contraste;
