-- Ejecutar UNA sola vez sobre la base existente y después respaldarla.
-- No elimina tablas, datos ni la columna clientes.direccion heredada.
-- Si el esquema ya coincide con pos_aguacates.sql del 16-07-2026, no ejecutar.

START TRANSACTION;

ALTER TABLE usuarios
  MODIFY username VARCHAR(50) NOT NULL,
  ADD COLUMN password_hash VARCHAR(255) NULL AFTER password,
  ADD COLUMN rol ENUM('ADMON_GRAL','CAJERO') NOT NULL DEFAULT 'CAJERO' AFTER password_hash,
  MODIFY activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD UNIQUE KEY ux_usuarios_username (username);

UPDATE usuarios SET rol = 'ADMON_GRAL' WHERE username = 'admin';

-- Conserva los nombres y datos actuales; direccion queda intacta por compatibilidad/histórico.
ALTER TABLE clientes
  CHANGE COLUMN nombre nombre_razon_social VARCHAR(180) NOT NULL,
  ADD COLUMN rfc VARCHAR(13) NULL AFTER nombre_razon_social,
  ADD COLUMN correo_electronico VARCHAR(180) NULL AFTER telefono,
  ADD UNIQUE KEY ux_clientes_rfc (rfc);

ALTER TABLE productos
  MODIFY precio_venta DECIMAL(12,2) NOT NULL,
  MODIFY stock DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN stock_minimo DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER stock;

ALTER TABLE ventas
  MODIFY total DECIMAL(12,2) NOT NULL,
  CHANGE COLUMN estado estado_pago ENUM('PAGADO','PENDIENTE') NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN estado_venta ENUM('ACTIVA','CANCELADA') NOT NULL DEFAULT 'ACTIVA' AFTER estado_pago,
  ADD COLUMN cancelada_por INT NULL AFTER estado_venta,
  ADD COLUMN cancelada_at DATETIME NULL AFTER cancelada_por,
  ADD COLUMN motivo_cancelacion VARCHAR(255) NULL AFTER cancelada_at,
  ADD COLUMN impresiones INT UNSIGNED NOT NULL DEFAULT 0 AFTER motivo_cancelacion,
  ADD COLUMN ultima_impresion_at DATETIME NULL AFTER impresiones,
  ADD KEY ix_ventas_fecha_estado (fecha, estado_venta),
  ADD KEY ix_ventas_cancelada_por (cancelada_por),
  ADD CONSTRAINT fk_ventas_cancelada_por FOREIGN KEY (cancelada_por) REFERENCES usuarios(id);

UPDATE ventas SET estado_pago = IF(tipo_pago = 'CONTADO', 'PAGADO', estado_pago);

ALTER TABLE detalle_venta
  MODIFY cantidad DECIMAL(12,2) NOT NULL,
  MODIFY precio_unitario DECIMAL(12,2) NOT NULL,
  MODIFY subtotal DECIMAL(12,2) NOT NULL;

ALTER TABLE cuentas_por_cobrar
  MODIFY venta_id INT NOT NULL,
  MODIFY cliente_id INT NOT NULL,
  MODIFY total_deuda DECIMAL(12,2) NOT NULL,
  MODIFY saldo_pendiente DECIMAL(12,2) NOT NULL,
  MODIFY estado ENUM('PENDIENTE','PAGADO','CANCELADA') NOT NULL DEFAULT 'PENDIENTE';

ALTER TABLE movimientos_inventario
  MODIFY tipo ENUM('ENTRADA','SALIDA') NOT NULL,
  MODIFY cantidad DECIMAL(12,2) NOT NULL,
  MODIFY motivo VARCHAR(150) NOT NULL,
  ADD COLUMN usuario_id INT NULL AFTER referencia_id,
  ADD KEY ix_movimientos_referencia (referencia_id),
  ADD KEY ix_movimientos_usuario (usuario_id),
  ADD CONSTRAINT fk_movimientos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id);

COMMIT;

-- Las contraseñas heredadas se convierten a bcrypt y usuarios.password se pone en NULL
-- automáticamente durante el primer login válido de cada usuario.
-- El stock negativo histórico NO se altera: debe conciliarse con entradas físicas reales.
