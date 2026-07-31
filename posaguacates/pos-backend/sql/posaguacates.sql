-- POS Aguacates - esquema sanitizado sin datos comerciales.
-- Para crear el primer administrador use: npm run usuario:crear
-- Aplique despues las migraciones con: npm run db:migrate

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `posaguacates`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `aplicaciones_pago`
--

CREATE TABLE `aplicaciones_pago` (
  `id` int(11) NOT NULL,
  `pago_id` int(11) NOT NULL,
  `cuenta_id` int(11) NOT NULL,
  `monto_aplicado` decimal(12,2) NOT NULL,
  `saldo_anterior` decimal(12,2) NOT NULL,
  `saldo_resultante` decimal(12,2) NOT NULL,
  `estado` enum('ACTIVA','CANCELADA') NOT NULL DEFAULT 'ACTIVA',
  `cancelada_por` int(11) DEFAULT NULL,
  `cancelada_at` datetime DEFAULT NULL,
  `motivo_cancelacion` varchar(255) DEFAULT NULL
) ;

--
--


-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id` int(11) NOT NULL,
  `nombre_razon_social` varchar(180) NOT NULL,
  `rfc` varchar(13) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `correo_electronico` varchar(180) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
--


-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `compras`
--

CREATE TABLE `compras` (
  `id` int(11) NOT NULL,
  `total` decimal(10,2) DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cuentas_por_cobrar`
--

CREATE TABLE `cuentas_por_cobrar` (
  `id` int(11) NOT NULL,
  `venta_id` int(11) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `total_deuda` decimal(12,2) NOT NULL,
  `saldo_pendiente` decimal(12,2) NOT NULL,
  `estado` enum('PENDIENTE','PAGADO','CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
  `fecha` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
--


-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_compra`
--

CREATE TABLE `detalle_compra` (
  `id` int(11) NOT NULL,
  `compra_id` int(11) DEFAULT NULL,
  `producto_id` int(11) DEFAULT NULL,
  `cantidad` decimal(10,2) DEFAULT NULL,
  `precio_compra` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_orden_venta`
--

CREATE TABLE `detalle_orden_venta` (
  `id` int(11) NOT NULL,
  `orden_id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `cantidad` decimal(12,2) NOT NULL,
  `precio_estimado` decimal(12,2) NOT NULL,
  `subtotal_estimado` decimal(12,2) NOT NULL,
  `observaciones` varchar(255) DEFAULT NULL
) ;

--
--


-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_venta`
--

CREATE TABLE `detalle_venta` (
  `id` int(11) NOT NULL,
  `venta_id` int(11) DEFAULT NULL,
  `producto_id` int(11) DEFAULT NULL,
  `cantidad` decimal(12,2) NOT NULL,
  `precio_unitario` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
--


-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientos_cartera`
--

CREATE TABLE `movimientos_cartera` (
  `id` int(11) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `venta_id` int(11) DEFAULT NULL,
  `cuenta_id` int(11) DEFAULT NULL,
  `pago_id` int(11) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `concepto` enum('VENTA_MOSTRADOR','VENTA_CREDITO','COBRO','COBRO_MOSTRADOR','CANCELACION','CANCELACION_PAGO','AJUSTE') NOT NULL,
  `folio` varchar(30) NOT NULL,
  `cargo` decimal(12,2) NOT NULL DEFAULT 0.00,
  `credito` decimal(12,2) NOT NULL DEFAULT 0.00,
  `saldo_resultante` decimal(12,2) NOT NULL,
  `descripcion` varchar(500) DEFAULT NULL,
  `usuario_id` int(11) DEFAULT NULL
) ;

--
--


-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientos_inventario`
--

CREATE TABLE `movimientos_inventario` (
  `id` int(11) NOT NULL,
  `producto_id` int(11) DEFAULT NULL,
  `tipo` enum('ENTRADA','SALIDA') NOT NULL,
  `cantidad` decimal(12,2) NOT NULL,
  `motivo` varchar(150) NOT NULL,
  `referencia_id` int(11) DEFAULT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
--


-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ordenes_venta`
--

CREATE TABLE `ordenes_venta` (
  `id` int(11) NOT NULL,
  `folio` varchar(20) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `estado` enum('BORRADOR','PENDIENTE','CONVERTIDA','CANCELADA') NOT NULL DEFAULT 'BORRADOR',
  `observaciones` varchar(500) DEFAULT NULL,
  `total_estimado` decimal(12,2) NOT NULL DEFAULT 0.00,
  `venta_id` int(11) DEFAULT NULL,
  `creada_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizada_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `convertida_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
--


-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pagos`
--

CREATE TABLE `pagos` (
  `id` int(11) NOT NULL,
  `cliente_id` int(11) DEFAULT NULL,
  `cuenta_id` int(11) DEFAULT NULL,
  `monto` decimal(10,2) DEFAULT NULL,
  `monto_total` decimal(12,2) DEFAULT NULL,
  `metodo_pago` varchar(50) DEFAULT NULL,
  `referencia` varchar(100) DEFAULT NULL,
  `observaciones` varchar(500) DEFAULT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp(),
  `estado` enum('ACTIVO','CANCELADO') NOT NULL DEFAULT 'ACTIVO',
  `cancelado_por` int(11) DEFAULT NULL,
  `cancelado_at` datetime DEFAULT NULL,
  `motivo_cancelacion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
--


-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `predicciones`
--

CREATE TABLE `predicciones` (
  `id` int(11) NOT NULL,
  `producto_id` int(11) DEFAULT NULL,
  `fecha_prediccion` date DEFAULT NULL,
  `cantidad_predicha` decimal(10,2) DEFAULT NULL,
  `modelo_usado` varchar(50) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id` int(11) NOT NULL,
  `codigo` varchar(30) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `precio_venta` decimal(12,2) NOT NULL,
  `stock` decimal(12,2) NOT NULL DEFAULT 0.00,
  `stock_minimo` decimal(12,2) NOT NULL DEFAULT 0.00,
  `unidad` varchar(20) DEFAULT 'kg',
  `activo` tinyint(1) DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `kilos_por_caja` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
--


-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `rol` enum('ADMON_GRAL','CAJERO') NOT NULL DEFAULT 'CAJERO',
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
--


-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

CREATE TABLE `ventas` (
  `id` int(11) NOT NULL,
  `cliente_id` int(11) DEFAULT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `total` decimal(12,2) NOT NULL,
  `tipo_pago` enum('CONTADO','CREDITO') NOT NULL,
  `metodo_pago` enum('EFECTIVO','TRANSFERENCIA','CHEQUE') NOT NULL DEFAULT 'EFECTIVO',
  `estado_pago` enum('PAGADO','PENDIENTE') NOT NULL DEFAULT 'PENDIENTE',
  `estado_venta` enum('ACTIVA','CANCELADA') NOT NULL DEFAULT 'ACTIVA',
  `cancelada_por` int(11) DEFAULT NULL,
  `cancelada_at` datetime DEFAULT NULL,
  `motivo_cancelacion` varchar(255) DEFAULT NULL,
  `impresiones` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `ultima_impresion_at` datetime DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
--


--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `aplicaciones_pago`
--
ALTER TABLE `aplicaciones_pago`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ux_aplicacion_pago_cuenta` (`pago_id`,`cuenta_id`),
  ADD KEY `ix_aplicacion_cuenta` (`cuenta_id`),
  ADD KEY `fk_aplicacion_cancelada_por` (`cancelada_por`);

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ux_clientes_rfc` (`rfc`);

--
-- Indices de la tabla `compras`
--
ALTER TABLE `compras`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `cuentas_por_cobrar`
--
ALTER TABLE `cuentas_por_cobrar`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ux_cuentas_venta` (`venta_id`),
  ADD KEY `ix_cuentas_cliente_estado` (`cliente_id`,`estado`);

--
-- Indices de la tabla `detalle_compra`
--
ALTER TABLE `detalle_compra`
  ADD PRIMARY KEY (`id`),
  ADD KEY `compra_id` (`compra_id`),
  ADD KEY `producto_id` (`producto_id`);

--
-- Indices de la tabla `detalle_orden_venta`
--
ALTER TABLE `detalle_orden_venta`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ux_detalle_orden_producto` (`orden_id`,`producto_id`),
  ADD KEY `ix_detalle_orden_producto` (`producto_id`);

--
-- Indices de la tabla `detalle_venta`
--
ALTER TABLE `detalle_venta`
  ADD PRIMARY KEY (`id`),
  ADD KEY `venta_id` (`venta_id`),
  ADD KEY `producto_id` (`producto_id`);

--
-- Indices de la tabla `movimientos_cartera`
--
ALTER TABLE `movimientos_cartera`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ux_cartera_pago_cuenta` (`pago_id`,`cuenta_id`),
  ADD KEY `ix_cartera_cliente_fecha` (`cliente_id`,`fecha`,`id`),
  ADD KEY `ix_cartera_cuenta` (`cuenta_id`),
  ADD KEY `ix_cartera_usuario` (`usuario_id`),
  ADD KEY `ix_cartera_venta_concepto` (`venta_id`,`concepto`);

--
-- Indices de la tabla `movimientos_inventario`
--
ALTER TABLE `movimientos_inventario`
  ADD PRIMARY KEY (`id`),
  ADD KEY `producto_id` (`producto_id`),
  ADD KEY `ix_movimientos_referencia` (`referencia_id`),
  ADD KEY `ix_movimientos_usuario` (`usuario_id`);

--
-- Indices de la tabla `ordenes_venta`
--
ALTER TABLE `ordenes_venta`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ux_ordenes_folio` (`folio`),
  ADD UNIQUE KEY `ux_ordenes_venta` (`venta_id`),
  ADD KEY `ix_ordenes_estado_fecha` (`estado`,`creada_at`),
  ADD KEY `ix_ordenes_cliente_estado` (`cliente_id`,`estado`),
  ADD KEY `ix_ordenes_usuario` (`usuario_id`);

--
-- Indices de la tabla `pagos`
--
ALTER TABLE `pagos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cuenta_id` (`cuenta_id`),
  ADD KEY `ix_pagos_cliente_fecha` (`cliente_id`,`fecha`),
  ADD KEY `ix_pagos_usuario` (`usuario_id`),
  ADD KEY `ix_pagos_cancelado_por` (`cancelado_por`);

--
-- Indices de la tabla `predicciones`
--
ALTER TABLE `predicciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `producto_id` (`producto_id`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ux_productos_codigo` (`codigo`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ux_usuarios_username` (`username`);

--
-- Indices de la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cliente_id` (`cliente_id`),
  ADD KEY `usuario_id` (`usuario_id`),
  ADD KEY `ix_ventas_fecha_estado` (`fecha`,`estado_venta`),
  ADD KEY `ix_ventas_cancelada_por` (`cancelada_por`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `aplicaciones_pago`
--
ALTER TABLE `aplicaciones_pago`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `compras`
--
ALTER TABLE `compras`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `cuentas_por_cobrar`
--
ALTER TABLE `cuentas_por_cobrar`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `detalle_compra`
--
ALTER TABLE `detalle_compra`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `detalle_orden_venta`
--
ALTER TABLE `detalle_orden_venta`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `detalle_venta`
--
ALTER TABLE `detalle_venta`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `movimientos_cartera`
--
ALTER TABLE `movimientos_cartera`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `movimientos_inventario`
--
ALTER TABLE `movimientos_inventario`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `ordenes_venta`
--
ALTER TABLE `ordenes_venta`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pagos`
--
ALTER TABLE `pagos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `predicciones`
--
ALTER TABLE `predicciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `ventas`
--
ALTER TABLE `ventas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `aplicaciones_pago`
--
ALTER TABLE `aplicaciones_pago`
  ADD CONSTRAINT `fk_aplicacion_cancelada_por` FOREIGN KEY (`cancelada_por`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `fk_aplicacion_cuenta` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas_por_cobrar` (`id`),
  ADD CONSTRAINT `fk_aplicacion_pago` FOREIGN KEY (`pago_id`) REFERENCES `pagos` (`id`);

--
-- Filtros para la tabla `cuentas_por_cobrar`
--
ALTER TABLE `cuentas_por_cobrar`
  ADD CONSTRAINT `fk_cuentas_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`),
  ADD CONSTRAINT `fk_cuentas_venta` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`);

--
-- Filtros para la tabla `detalle_compra`
--
ALTER TABLE `detalle_compra`
  ADD CONSTRAINT `detalle_compra_ibfk_1` FOREIGN KEY (`compra_id`) REFERENCES `compras` (`id`),
  ADD CONSTRAINT `detalle_compra_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`);

--
-- Filtros para la tabla `detalle_orden_venta`
--
ALTER TABLE `detalle_orden_venta`
  ADD CONSTRAINT `fk_detalle_orden` FOREIGN KEY (`orden_id`) REFERENCES `ordenes_venta` (`id`),
  ADD CONSTRAINT `fk_detalle_orden_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`);

--
-- Filtros para la tabla `detalle_venta`
--
ALTER TABLE `detalle_venta`
  ADD CONSTRAINT `detalle_venta_ibfk_1` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`),
  ADD CONSTRAINT `detalle_venta_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`);

--
-- Filtros para la tabla `movimientos_cartera`
--
ALTER TABLE `movimientos_cartera`
  ADD CONSTRAINT `fk_cartera_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`),
  ADD CONSTRAINT `fk_cartera_cuenta` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas_por_cobrar` (`id`),
  ADD CONSTRAINT `fk_cartera_pago` FOREIGN KEY (`pago_id`) REFERENCES `pagos` (`id`),
  ADD CONSTRAINT `fk_cartera_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `fk_cartera_venta` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`);

--
-- Filtros para la tabla `movimientos_inventario`
--
ALTER TABLE `movimientos_inventario`
  ADD CONSTRAINT `fk_movimientos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `movimientos_inventario_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`);

--
-- Filtros para la tabla `ordenes_venta`
--
ALTER TABLE `ordenes_venta`
  ADD CONSTRAINT `fk_ordenes_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`),
  ADD CONSTRAINT `fk_ordenes_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `fk_ordenes_venta` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`);

--
-- Filtros para la tabla `pagos`
--
ALTER TABLE `pagos`
  ADD CONSTRAINT `fk_pagos_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`),
  ADD CONSTRAINT `fk_pagos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `fk_pagos_cancelado_por` FOREIGN KEY (`cancelado_por`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `pagos_ibfk_1` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas_por_cobrar` (`id`);

--
-- Filtros para la tabla `predicciones`
--
ALTER TABLE `predicciones`
  ADD CONSTRAINT `predicciones_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`);

--
-- Filtros para la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD CONSTRAINT `fk_ventas_cancelada_por` FOREIGN KEY (`cancelada_por`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `ventas_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`),
  ADD CONSTRAINT `ventas_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
