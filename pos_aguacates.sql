-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 16-07-2026 a las 06:18:07
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `pos_aguacates`
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
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id`, `nombre_razon_social`, `rfc`, `telefono`, `correo_electronico`, `activo`, `creado_en`) VALUES
(1, 'Publico General', NULL, '', NULL, 1, '2026-04-30 20:14:27'),
(2, 'Roberto', NULL, '9991323459', NULL, 1, '2026-05-07 20:08:00'),
(3, 'MEGACOSECHA', NULL, '9991020542', NULL, 1, '2026-05-07 20:08:25'),
(4, 'Ve Central', NULL, '99942056423', NULL, 1, '2026-05-07 20:36:24'),
(7, 'Luis Chan', NULL, '9991020305', NULL, 1, '2026-05-07 20:39:59'),
(8, 'Rafael', NULL, '9991344587', NULL, 1, '2026-05-08 13:42:41'),
(9, 'Yahir Arceo', NULL, '9993404620', NULL, 1, '2026-05-14 17:33:09'),
(10, 'Caballitos', NULL, '', NULL, 1, '2026-05-14 19:12:16'),
(11, 'Jesus Caamal', NULL, '', NULL, 1, '2026-05-14 19:12:37'),
(12, 'Don Miguel Escalante', NULL, '', NULL, 1, '2026-05-14 19:13:21'),
(13, 'Jose Caamal', NULL, '', NULL, 1, '2026-05-14 19:14:37');

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
-- Volcado de datos para la tabla `cuentas_por_cobrar`
--

INSERT INTO `cuentas_por_cobrar` (`id`, `venta_id`, `cliente_id`, `total_deuda`, `saldo_pendiente`, `estado`, `fecha`) VALUES
(3, 8, 1, 250.00, 0.00, 'PAGADO', '2026-04-30 20:48:43'),
(4, 9, 1, 165.00, 0.00, 'PAGADO', '2026-04-30 21:04:05'),
(5, 11, 1, 165.00, 0.00, 'PAGADO', '2026-04-30 22:27:36'),
(6, 12, 1, 330.00, 0.00, 'PAGADO', '2026-04-30 22:28:40'),
(7, 13, 1, 405.00, 0.00, 'PAGADO', '2026-05-07 18:33:26'),
(8, 14, 1, 400.00, 0.00, 'PAGADO', '2026-05-07 19:23:48'),
(9, 16, 1, 1340.00, 0.00, 'PAGADO', '2026-05-07 19:39:06'),
(10, 18, 3, 165.00, 0.00, 'PAGADO', '2026-05-07 20:21:27'),
(11, 28, 11, 6950.00, 6300.00, 'PENDIENTE', '2026-05-14 19:26:25'),
(12, 30, 4, 9275.00, 9275.00, 'PENDIENTE', '2026-05-14 19:54:41'),
(13, 31, 3, 4500.00, 0.00, 'PAGADO', '2026-05-14 19:55:13'),
(14, 32, 3, 4450.00, 4450.00, 'PENDIENTE', '2026-05-14 20:02:05');

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
-- Volcado de datos para la tabla `detalle_venta`
--

INSERT INTO `detalle_venta` (`id`, `venta_id`, `producto_id`, `cantidad`, `precio_unitario`, `subtotal`) VALUES
(7, 8, 1, 5.00, 50.00, 250.00),
(8, 9, 1, 1.00, 50.00, 50.00),
(9, 9, 2, 1.00, 45.00, 45.00),
(10, 9, 3, 1.00, 40.00, 40.00),
(11, 9, 4, 1.00, 30.00, 30.00),
(12, 10, 1, 1.00, 50.00, 50.00),
(13, 10, 2, 1.00, 45.00, 45.00),
(14, 10, 3, 1.00, 40.00, 40.00),
(15, 10, 4, 1.00, 30.00, 30.00),
(16, 11, 1, 1.00, 50.00, 50.00),
(17, 11, 3, 1.00, 40.00, 40.00),
(18, 11, 2, 1.00, 45.00, 45.00),
(19, 11, 4, 1.00, 30.00, 30.00),
(20, 12, 1, 2.00, 50.00, 100.00),
(21, 12, 2, 2.00, 45.00, 90.00),
(22, 12, 3, 2.00, 40.00, 80.00),
(23, 12, 4, 2.00, 30.00, 60.00),
(24, 13, 1, 2.00, 50.00, 100.00),
(25, 13, 2, 3.00, 45.00, 135.00),
(26, 13, 3, 2.00, 40.00, 80.00),
(27, 13, 4, 3.00, 30.00, 90.00),
(28, 14, 3, 10.00, 40.00, 400.00),
(29, 15, 4, 10.00, 30.00, 300.00),
(30, 16, 1, 8.00, 50.00, 400.00),
(31, 16, 2, 10.00, 45.00, 450.00),
(32, 16, 3, 10.00, 40.00, 400.00),
(33, 16, 4, 3.00, 30.00, 90.00),
(34, 17, 4, 3.00, 30.00, 90.00),
(35, 17, 3, 10.00, 40.00, 400.00),
(36, 17, 2, 10.00, 45.00, 450.00),
(37, 17, 1, 8.00, 50.00, 400.00),
(38, 18, 4, 1.00, 30.00, 30.00),
(39, 18, 3, 1.00, 40.00, 40.00),
(40, 18, 2, 1.00, 45.00, 45.00),
(41, 18, 1, 1.00, 50.00, 50.00),
(42, 19, 4, 1.00, 30.00, 30.00),
(43, 20, 4, 1.00, 30.00, 30.00),
(44, 20, 3, 100.00, 40.00, 4000.00),
(45, 20, 2, 60.00, 45.00, 2700.00),
(46, 20, 1, 30.00, 50.00, 1500.00),
(47, 21, 4, 120.00, 30.00, 3600.00),
(48, 21, 3, 10.00, 40.00, 400.00),
(49, 21, 2, 100.00, 45.00, 4500.00),
(50, 21, 1, 10.00, 50.00, 500.00),
(51, 22, 1, 10.00, 50.00, 500.00),
(52, 22, 2, 200.00, 45.00, 9000.00),
(53, 22, 3, 300.00, 40.00, 12000.00),
(54, 22, 4, 100.00, 30.00, 3000.00),
(55, 23, 1, 10.00, 50.00, 500.00),
(56, 23, 2, 100.00, 45.00, 4500.00),
(57, 23, 4, 1000.00, 30.00, 30000.00),
(58, 24, 4, 1000.00, 30.00, 30000.00),
(59, 24, 1, 10.00, 50.00, 500.00),
(60, 24, 2, 100.00, 45.00, 4500.00),
(61, 24, 3, 100.00, 40.00, 4000.00),
(62, 24, 4, 1000.00, 30.00, 30000.00),
(63, 25, 4, 1.00, 30.00, 30.00),
(64, 25, 4, 100.00, 30.00, 3000.00),
(65, 25, 3, 100.00, 40.00, 4000.00),
(66, 25, 2, 100.00, 45.00, 4500.00),
(67, 25, 1, 100.00, 50.00, 5000.00),
(68, 26, 2, 10.00, 45.00, 450.00),
(69, 27, 1, 100.00, 50.00, 5000.00),
(70, 27, 4, 1.00, 30.00, 30.00),
(71, 27, 3, 1.00, 40.00, 40.00),
(72, 27, 2, 1.00, 45.00, 45.00),
(73, 28, 4, 30.00, 30.00, 900.00),
(74, 28, 3, 15.00, 40.00, 600.00),
(75, 28, 2, 10.00, 45.00, 450.00),
(76, 28, 1, 100.00, 50.00, 5000.00),
(77, 29, 1, 100.00, 50.00, 5000.00),
(78, 30, 1, 100.00, 50.00, 5000.00),
(79, 30, 4, 100.00, 30.00, 3000.00),
(80, 30, 3, 15.00, 40.00, 600.00),
(81, 30, 2, 15.00, 45.00, 675.00),
(82, 31, 1, 10.00, 50.00, 500.00),
(83, 31, 3, 100.00, 40.00, 4000.00),
(84, 32, 3, 100.00, 40.00, 4000.00),
(85, 32, 2, 10.00, 45.00, 450.00);

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
-- Volcado de datos para la tabla `movimientos_inventario`
--

INSERT INTO `movimientos_inventario` (`id`, `producto_id`, `tipo`, `cantidad`, `motivo`, `referencia_id`, `usuario_id`, `fecha`) VALUES
(3, 1, 'SALIDA', 5.00, 'VENTA', 8, NULL, '2026-04-30 20:48:43'),
(4, 1, 'SALIDA', 1.00, 'VENTA', 9, NULL, '2026-04-30 21:04:05'),
(5, 2, 'SALIDA', 1.00, 'VENTA', 9, NULL, '2026-04-30 21:04:05'),
(6, 3, 'SALIDA', 1.00, 'VENTA', 9, NULL, '2026-04-30 21:04:05'),
(7, 4, 'SALIDA', 1.00, 'VENTA', 9, NULL, '2026-04-30 21:04:05'),
(8, 1, 'SALIDA', 1.00, 'VENTA', 10, NULL, '2026-04-30 22:27:18'),
(9, 2, 'SALIDA', 1.00, 'VENTA', 10, NULL, '2026-04-30 22:27:18'),
(10, 3, 'SALIDA', 1.00, 'VENTA', 10, NULL, '2026-04-30 22:27:18'),
(11, 4, 'SALIDA', 1.00, 'VENTA', 10, NULL, '2026-04-30 22:27:18'),
(12, 1, 'SALIDA', 1.00, 'VENTA', 11, NULL, '2026-04-30 22:27:35'),
(13, 3, 'SALIDA', 1.00, 'VENTA', 11, NULL, '2026-04-30 22:27:35'),
(14, 2, 'SALIDA', 1.00, 'VENTA', 11, NULL, '2026-04-30 22:27:35'),
(15, 4, 'SALIDA', 1.00, 'VENTA', 11, NULL, '2026-04-30 22:27:36'),
(16, 1, 'SALIDA', 2.00, 'VENTA', 12, NULL, '2026-04-30 22:28:39'),
(17, 2, 'SALIDA', 2.00, 'VENTA', 12, NULL, '2026-04-30 22:28:39'),
(18, 3, 'SALIDA', 2.00, 'VENTA', 12, NULL, '2026-04-30 22:28:39'),
(19, 4, 'SALIDA', 2.00, 'VENTA', 12, NULL, '2026-04-30 22:28:40'),
(20, 1, 'SALIDA', 2.00, 'VENTA', 13, NULL, '2026-05-07 18:33:26'),
(21, 2, 'SALIDA', 3.00, 'VENTA', 13, NULL, '2026-05-07 18:33:26'),
(22, 3, 'SALIDA', 2.00, 'VENTA', 13, NULL, '2026-05-07 18:33:26'),
(23, 4, 'SALIDA', 3.00, 'VENTA', 13, NULL, '2026-05-07 18:33:26'),
(24, 3, 'SALIDA', 10.00, 'VENTA', 14, NULL, '2026-05-07 19:23:48'),
(25, 4, 'SALIDA', 10.00, 'VENTA', 15, NULL, '2026-05-07 19:23:53'),
(26, 1, 'SALIDA', 8.00, 'VENTA', 16, NULL, '2026-05-07 19:39:06'),
(27, 2, 'SALIDA', 10.00, 'VENTA', 16, NULL, '2026-05-07 19:39:06'),
(28, 3, 'SALIDA', 10.00, 'VENTA', 16, NULL, '2026-05-07 19:39:06'),
(29, 4, 'SALIDA', 3.00, 'VENTA', 16, NULL, '2026-05-07 19:39:06'),
(30, 4, 'SALIDA', 3.00, 'VENTA', 17, NULL, '2026-05-07 19:43:33'),
(31, 3, 'SALIDA', 10.00, 'VENTA', 17, NULL, '2026-05-07 19:43:33'),
(32, 2, 'SALIDA', 10.00, 'VENTA', 17, NULL, '2026-05-07 19:43:33'),
(33, 1, 'SALIDA', 8.00, 'VENTA', 17, NULL, '2026-05-07 19:43:33'),
(34, 4, 'SALIDA', 1.00, 'VENTA', 18, NULL, '2026-05-07 20:21:27'),
(35, 3, 'SALIDA', 1.00, 'VENTA', 18, NULL, '2026-05-07 20:21:27'),
(36, 2, 'SALIDA', 1.00, 'VENTA', 18, NULL, '2026-05-07 20:21:27'),
(37, 1, 'SALIDA', 1.00, 'VENTA', 18, NULL, '2026-05-07 20:21:27'),
(38, 4, 'SALIDA', 1.00, 'VENTA', 19, NULL, '2026-05-07 20:30:10'),
(39, 4, 'SALIDA', 1.00, 'VENTA', 20, NULL, '2026-05-07 20:56:38'),
(40, 3, 'SALIDA', 100.00, 'VENTA', 20, NULL, '2026-05-07 20:56:38'),
(41, 2, 'SALIDA', 60.00, 'VENTA', 20, NULL, '2026-05-07 20:56:38'),
(42, 1, 'SALIDA', 30.00, 'VENTA', 20, NULL, '2026-05-07 20:56:38'),
(43, 4, 'SALIDA', 120.00, 'VENTA', 21, NULL, '2026-05-08 13:44:29'),
(44, 3, 'SALIDA', 10.00, 'VENTA', 21, NULL, '2026-05-08 13:44:29'),
(45, 2, 'SALIDA', 100.00, 'VENTA', 21, NULL, '2026-05-08 13:44:29'),
(46, 1, 'SALIDA', 10.00, 'VENTA', 21, NULL, '2026-05-08 13:44:29'),
(47, 1, 'SALIDA', 10.00, 'VENTA', 22, NULL, '2026-05-14 17:33:52'),
(48, 2, 'SALIDA', 200.00, 'VENTA', 22, NULL, '2026-05-14 17:33:52'),
(49, 3, 'SALIDA', 300.00, 'VENTA', 22, NULL, '2026-05-14 17:33:52'),
(50, 4, 'SALIDA', 100.00, 'VENTA', 22, NULL, '2026-05-14 17:33:52'),
(51, 1, 'SALIDA', 10.00, 'VENTA', 23, NULL, '2026-05-14 18:16:30'),
(52, 2, 'SALIDA', 100.00, 'VENTA', 23, NULL, '2026-05-14 18:16:30'),
(53, 4, 'SALIDA', 1000.00, 'VENTA', 23, NULL, '2026-05-14 18:16:30'),
(54, 4, 'SALIDA', 1000.00, 'VENTA', 24, NULL, '2026-05-14 18:18:37'),
(55, 1, 'SALIDA', 10.00, 'VENTA', 24, NULL, '2026-05-14 18:18:37'),
(56, 2, 'SALIDA', 100.00, 'VENTA', 24, NULL, '2026-05-14 18:18:37'),
(57, 3, 'SALIDA', 100.00, 'VENTA', 24, NULL, '2026-05-14 18:18:37'),
(58, 4, 'SALIDA', 1000.00, 'VENTA', 24, NULL, '2026-05-14 18:18:37'),
(59, 4, 'SALIDA', 1.00, 'VENTA', 25, NULL, '2026-05-14 18:43:25'),
(60, 4, 'SALIDA', 100.00, 'VENTA', 25, NULL, '2026-05-14 18:43:25'),
(61, 3, 'SALIDA', 100.00, 'VENTA', 25, NULL, '2026-05-14 18:43:25'),
(62, 2, 'SALIDA', 100.00, 'VENTA', 25, NULL, '2026-05-14 18:43:25'),
(63, 1, 'SALIDA', 100.00, 'VENTA', 25, NULL, '2026-05-14 18:43:25'),
(64, 2, 'SALIDA', 10.00, 'VENTA', 26, NULL, '2026-05-14 18:54:58'),
(65, 1, 'SALIDA', 100.00, 'VENTA', 27, NULL, '2026-05-14 18:56:29'),
(66, 4, 'SALIDA', 1.00, 'VENTA', 27, NULL, '2026-05-14 18:56:29'),
(67, 3, 'SALIDA', 1.00, 'VENTA', 27, NULL, '2026-05-14 18:56:29'),
(68, 2, 'SALIDA', 1.00, 'VENTA', 27, NULL, '2026-05-14 18:56:30'),
(69, 4, 'SALIDA', 30.00, 'VENTA', 28, NULL, '2026-05-14 19:26:25'),
(70, 3, 'SALIDA', 15.00, 'VENTA', 28, NULL, '2026-05-14 19:26:25'),
(71, 2, 'SALIDA', 10.00, 'VENTA', 28, NULL, '2026-05-14 19:26:25'),
(72, 1, 'SALIDA', 100.00, 'VENTA', 28, NULL, '2026-05-14 19:26:25'),
(73, 1, 'SALIDA', 100.00, 'VENTA', 29, NULL, '2026-05-14 19:35:42'),
(74, 1, 'SALIDA', 100.00, 'VENTA', 30, NULL, '2026-05-14 19:54:41'),
(75, 4, 'SALIDA', 100.00, 'VENTA', 30, NULL, '2026-05-14 19:54:41'),
(76, 3, 'SALIDA', 15.00, 'VENTA', 30, NULL, '2026-05-14 19:54:41'),
(77, 2, 'SALIDA', 15.00, 'VENTA', 30, NULL, '2026-05-14 19:54:41'),
(78, 1, 'SALIDA', 10.00, 'VENTA', 31, NULL, '2026-05-14 19:55:13'),
(79, 3, 'SALIDA', 100.00, 'VENTA', 31, NULL, '2026-05-14 19:55:13'),
(80, 3, 'SALIDA', 100.00, 'VENTA', 32, NULL, '2026-05-14 20:02:05'),
(81, 2, 'SALIDA', 10.00, 'VENTA', 32, NULL, '2026-05-14 20:02:05');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pagos`
--

CREATE TABLE `pagos` (
  `id` int(11) NOT NULL,
  `cuenta_id` int(11) DEFAULT NULL,
  `monto` decimal(10,2) DEFAULT NULL,
  `metodo_pago` varchar(50) DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pagos`
--

INSERT INTO `pagos` (`id`, `cuenta_id`, `monto`, `metodo_pago`, `fecha`) VALUES
(2, NULL, NULL, 'EFECTIVO', '2026-04-30 20:23:58'),
(5, 3, 200.00, 'EFECTIVO', '2026-04-30 20:50:03');

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
  `nombre` varchar(100) NOT NULL,
  `precio_venta` decimal(12,2) NOT NULL,
  `stock` decimal(12,2) NOT NULL DEFAULT 0.00,
  `stock_minimo` decimal(12,2) NOT NULL DEFAULT 0.00,
  `unidad` varchar(20) DEFAULT 'kg',
  `activo` tinyint(1) DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `nombre`, `precio_venta`, `stock`, `stock_minimo`, `unidad`, `activo`, `creado_en`) VALUES
(1, 'Aguacate Hass Extra', 50.00, -509.00, 0.00, 'kg', 1, '2026-04-30 20:48:13'),
(2, 'Aguacate Hass Grande', 45.00, -635.00, 0.00, 'kg', 1, '2026-04-30 20:48:13'),
(3, 'Aguacate Hass Mediano', 40.00, -779.00, 0.00, 'kg', 1, '2026-04-30 20:48:13'),
(4, 'Aguacate Hass Tercera', 30.00, -3379.00, 0.00, 'kg', 1, '2026-04-30 20:48:13');

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
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `username`, `password`, `password_hash`, `rol`, `activo`) VALUES
(1, 'Admin', 'admin', '1234', NULL, 'ADMON_GRAL', 1);

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
-- Volcado de datos para la tabla `ventas`
--

INSERT INTO `ventas` (`id`, `cliente_id`, `usuario_id`, `total`, `tipo_pago`, `estado_pago`, `estado_venta`, `cancelada_por`, `cancelada_at`, `motivo_cancelacion`, `impresiones`, `ultima_impresion_at`, `fecha`) VALUES
(2, 1, 1, 725.00, 'CONTADO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-04-30 20:15:45'),
(3, 1, 1, 250.00, 'CREDITO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-04-30 20:26:45'),
(4, 1, 1, 250.00, 'CREDITO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-04-30 20:27:53'),
(5, 1, 1, 250.00, 'CREDITO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-04-30 20:31:40'),
(8, 1, 1, 250.00, 'CREDITO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-04-30 20:48:42'),
(9, 1, 1, 165.00, 'CREDITO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-04-30 21:04:05'),
(10, 1, 1, 165.00, 'CONTADO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-04-30 22:27:16'),
(11, 1, 1, 165.00, 'CREDITO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-04-30 22:27:35'),
(12, 1, 1, 330.00, 'CREDITO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-04-30 22:28:39'),
(13, 1, 1, 405.00, 'CREDITO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-07 18:33:25'),
(14, 1, 1, 400.00, 'CREDITO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-07 19:23:47'),
(15, 1, 1, 300.00, 'CONTADO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-07 19:23:53'),
(16, 1, 1, 1340.00, 'CREDITO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-07 19:39:06'),
(17, 1, 1, 1340.00, 'CONTADO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-07 19:43:33'),
(18, 3, 1, 165.00, 'CREDITO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-07 20:21:26'),
(19, NULL, 1, 30.00, 'CONTADO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-07 20:30:09'),
(20, 3, 1, 8230.00, 'CONTADO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-07 20:56:37'),
(21, 3, 1, 9000.00, 'CONTADO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-08 13:44:29'),
(22, 9, 1, 24500.00, 'CONTADO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 17:33:52'),
(23, NULL, 1, 35000.00, 'CONTADO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 18:16:30'),
(24, NULL, 1, 69000.00, 'CONTADO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 18:18:37'),
(25, 3, 1, 16530.00, 'CONTADO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 18:43:25'),
(26, 1, 1, 450.00, 'CONTADO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 18:54:57'),
(27, 1, 1, 5115.00, 'CONTADO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 18:56:29'),
(28, 11, 1, 6950.00, 'CREDITO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 19:26:24'),
(29, 1, 1, 5000.00, 'CONTADO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 19:35:42'),
(30, 4, 1, 9275.00, 'CREDITO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 19:54:40'),
(31, 3, 1, 4500.00, 'CREDITO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 19:55:13'),
(32, 3, 1, 4450.00, 'CREDITO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 20:02:04');

--
-- Índices para tablas volcadas
--

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
-- Indices de la tabla `detalle_venta`
--
ALTER TABLE `detalle_venta`
  ADD PRIMARY KEY (`id`),
  ADD KEY `venta_id` (`venta_id`),
  ADD KEY `producto_id` (`producto_id`);

--
-- Indices de la tabla `movimientos_inventario`
--
ALTER TABLE `movimientos_inventario`
  ADD PRIMARY KEY (`id`),
  ADD KEY `producto_id` (`producto_id`),
  ADD KEY `ix_movimientos_referencia` (`referencia_id`),
  ADD KEY `ix_movimientos_usuario` (`usuario_id`);

--
-- Indices de la tabla `pagos`
--
ALTER TABLE `pagos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cuenta_id` (`cuenta_id`);

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
  ADD PRIMARY KEY (`id`);

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
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `compras`
--
ALTER TABLE `compras`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `cuentas_por_cobrar`
--
ALTER TABLE `cuentas_por_cobrar`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `detalle_compra`
--
ALTER TABLE `detalle_compra`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `detalle_venta`
--
ALTER TABLE `detalle_venta`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=86;

--
-- AUTO_INCREMENT de la tabla `movimientos_inventario`
--
ALTER TABLE `movimientos_inventario`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=82;

--
-- AUTO_INCREMENT de la tabla `pagos`
--
ALTER TABLE `pagos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `predicciones`
--
ALTER TABLE `predicciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `ventas`
--
ALTER TABLE `ventas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- Restricciones para tablas volcadas
--

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
-- Filtros para la tabla `detalle_venta`
--
ALTER TABLE `detalle_venta`
  ADD CONSTRAINT `detalle_venta_ibfk_1` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`),
  ADD CONSTRAINT `detalle_venta_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`);

--
-- Filtros para la tabla `movimientos_inventario`
--
ALTER TABLE `movimientos_inventario`
  ADD CONSTRAINT `fk_movimientos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `movimientos_inventario_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`);

--
-- Filtros para la tabla `pagos`
--
ALTER TABLE `pagos`
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
