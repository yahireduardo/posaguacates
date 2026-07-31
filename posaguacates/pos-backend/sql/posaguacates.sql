-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 30-07-2026 a las 14:29:36
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.0.30

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
-- Volcado de datos para la tabla `aplicaciones_pago`
--

INSERT INTO `aplicaciones_pago` (`id`, `pago_id`, `cuenta_id`, `monto_aplicado`, `saldo_anterior`, `saldo_resultante`, `estado`, `cancelada_por`, `cancelada_at`, `motivo_cancelacion`) VALUES
(1, 5, 3, 200.00, 250.00, 50.00, 'ACTIVA', NULL, NULL, NULL),
(2, 6, 12, 500.00, 9275.00, 8775.00, 'ACTIVA', NULL, NULL, NULL),
(10, 14, 15, 5000.00, 45000.00, 40000.00, 'ACTIVA', NULL, NULL, NULL),
(15, 19, 14, 450.00, 4450.00, 4000.00, 'ACTIVA', NULL, NULL, NULL),
(21, 25, 22, 500.00, 900.00, 400.00, 'ACTIVA', NULL, NULL, NULL),
(33, 37, 15, 40000.00, 40000.00, 0.00, 'ACTIVA', NULL, NULL, NULL);

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
(12, 30, 4, 9275.00, 8775.00, 'PENDIENTE', '2026-05-14 19:54:41'),
(13, 31, 3, 4500.00, 0.00, 'PAGADO', '2026-05-14 19:55:13'),
(14, 32, 3, 4450.00, 4000.00, 'PENDIENTE', '2026-05-14 20:02:05'),
(15, 34, 1, 45000.00, 0.00, 'PAGADO', '2026-07-16 18:50:26'),
(16, 38, 10, 5000.00, 5000.00, 'PENDIENTE', '2026-07-29 18:39:13'),
(17, 39, 10, 5000.00, 5000.00, 'PENDIENTE', '2026-07-29 18:39:25'),
(18, 40, 10, 2500.00, 2500.00, 'PENDIENTE', '2026-07-29 18:56:53'),
(19, 41, 10, 500.00, 500.00, 'PENDIENTE', '2026-07-29 19:23:14'),
(20, 42, 10, 500.00, 500.00, 'PENDIENTE', '2026-07-29 19:23:28'),
(21, 50, 10, 8000.00, 8000.00, 'PENDIENTE', '2026-07-29 20:24:31'),
(22, 51, 3, 900.00, 400.00, 'PENDIENTE', '2026-07-29 20:27:56'),
(23, 52, 3, 30000.00, 30000.00, 'PENDIENTE', '2026-07-29 20:49:34');

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
-- Volcado de datos para la tabla `detalle_orden_venta`
--

INSERT INTO `detalle_orden_venta` (`id`, `orden_id`, `producto_id`, `cantidad`, `precio_estimado`, `subtotal_estimado`, `observaciones`) VALUES
(3, 1, 1, 5.00, 500.00, 2500.00, NULL),
(4, 2, 1, 2.00, 500.00, 1000.00, 'mulsay'),
(5, 3, 2, 1.00, 450.00, 450.00, '4'),
(6, 4, 1, 1.00, 500.00, 500.00, NULL),
(7, 5, 2, 20.00, 450.00, 9000.00, 'mulsay'),
(10, 6, 1, 10.00, 500.00, 5000.00, NULL),
(11, 7, 1, 1.00, 500.00, 500.00, NULL),
(12, 8, 1, 10.00, 500.00, 5000.00, NULL),
(14, 9, 1, 11.00, 500.00, 5500.00, NULL),
(15, 9, 3, 1.50, 400.00, 600.00, NULL),
(16, 10, 6, 100.00, 35.00, 3500.00, NULL),
(17, 11, 3, 10.00, 400.00, 4000.00, 'UNO');

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
(85, 32, 2, 10.00, 45.00, 450.00),
(86, 33, 1, 10.00, 500.00, 5000.00),
(87, 33, 2, 20.00, 450.00, 9000.00),
(88, 33, 3, 5.00, 400.00, 2000.00),
(89, 34, 1, 20.00, 500.00, 10000.00),
(90, 34, 3, 50.00, 400.00, 20000.00),
(91, 34, 4, 50.00, 300.00, 15000.00),
(92, 35, 1, 110.00, 500.00, 55000.00),
(93, 36, 1, 1.00, 500.00, 500.00),
(94, 36, 6, 100.00, 35.00, 3500.00),
(95, 37, 1, 10.00, 500.00, 5000.00),
(96, 38, 1, 10.00, 500.00, 5000.00),
(97, 39, 1, 10.00, 500.00, 5000.00),
(98, 40, 1, 5.00, 500.00, 2500.00),
(99, 41, 1, 1.00, 500.00, 500.00),
(100, 42, 1, 1.00, 500.00, 500.00),
(101, 43, 1, 5.00, 500.00, 2500.00),
(102, 44, 1, 1.00, 500.00, 500.00),
(103, 45, 1, 1.00, 500.00, 500.00),
(104, 45, 2, 1.00, 450.00, 450.00),
(105, 46, 1, 2.00, 500.00, 1000.00),
(106, 46, 2, 6.00, 450.00, 2700.00),
(107, 47, 3, 10.00, 400.00, 4000.00),
(108, 48, 1, 10.00, 500.00, 5000.00),
(109, 49, 1, 1.00, 500.00, 500.00),
(110, 50, 2, 10.00, 450.00, 4500.00),
(111, 50, 6, 100.00, 35.00, 3500.00),
(112, 51, 2, 2.00, 450.00, 900.00),
(113, 52, 4, 100.00, 300.00, 30000.00);

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
-- Volcado de datos para la tabla `movimientos_cartera`
--

INSERT INTO `movimientos_cartera` (`id`, `cliente_id`, `venta_id`, `cuenta_id`, `pago_id`, `fecha`, `concepto`, `folio`, `cargo`, `credito`, `saldo_resultante`, `descripcion`, `usuario_id`) VALUES
(1, 1, 8, 3, NULL, '2026-04-30 14:48:43', 'VENTA_CREDITO', 'V-00000008', 250.00, 0.00, 250.00, 'Venta a crédito', 1),
(2, 1, 9, 4, NULL, '2026-04-30 15:04:05', 'VENTA_CREDITO', 'V-00000009', 165.00, 0.00, 165.00, 'Venta a crédito', 1),
(3, 1, 11, 5, NULL, '2026-04-30 16:27:36', 'VENTA_CREDITO', 'V-00000011', 165.00, 0.00, 165.00, 'Venta a crédito', 1),
(4, 1, 12, 6, NULL, '2026-04-30 16:28:40', 'VENTA_CREDITO', 'V-00000012', 330.00, 0.00, 330.00, 'Venta a crédito', 1),
(5, 1, 13, 7, NULL, '2026-05-07 12:33:26', 'VENTA_CREDITO', 'V-00000013', 405.00, 0.00, 405.00, 'Venta a crédito', 1),
(6, 1, 14, 8, NULL, '2026-05-07 13:23:48', 'VENTA_CREDITO', 'V-00000014', 400.00, 0.00, 400.00, 'Venta a crédito', 1),
(7, 1, 16, 9, NULL, '2026-05-07 13:39:06', 'VENTA_CREDITO', 'V-00000016', 1340.00, 0.00, 1340.00, 'Venta a crédito', 1),
(8, 3, 18, 10, NULL, '2026-05-07 14:21:27', 'VENTA_CREDITO', 'V-00000018', 165.00, 0.00, 165.00, 'Venta a crédito', 1),
(9, 11, 28, 11, NULL, '2026-05-14 13:26:25', 'VENTA_CREDITO', 'V-00000028', 6950.00, 0.00, 6950.00, 'Venta a crédito', 1),
(10, 4, 30, 12, NULL, '2026-05-14 13:54:41', 'VENTA_CREDITO', 'V-00000030', 9275.00, 0.00, 9275.00, 'Venta a crédito', 1),
(11, 3, 31, 13, NULL, '2026-05-14 13:55:13', 'VENTA_CREDITO', 'V-00000031', 4500.00, 0.00, 4500.00, 'Venta a crédito', 1),
(12, 3, 32, 14, NULL, '2026-05-14 14:02:05', 'VENTA_CREDITO', 'V-00000032', 4450.00, 0.00, 4450.00, 'Venta a crédito', 1),
(13, 1, 34, 15, NULL, '2026-07-16 12:50:26', 'VENTA_CREDITO', 'V-00000034', 45000.00, 0.00, 45000.00, 'Venta a crédito', 1),
(16, 1, 8, 3, 5, '2026-04-30 14:50:03', 'COBRO', 'P-00000005', 0.00, 200.00, 50.00, 'Pago histórico migrado', NULL),
(17, 4, 30, 12, 6, '2026-07-29 00:00:00', 'COBRO', 'P-6', 0.00, 500.00, 8775.00, 'Aplicación de pago', 1),
(23, 10, 38, 16, NULL, '2026-07-29 12:39:13', 'VENTA_CREDITO', '38', 5000.00, 0.00, 5000.00, 'Venta a crédito', 1),
(24, 10, 39, 17, NULL, '2026-07-29 12:39:25', 'VENTA_CREDITO', '39', 5000.00, 0.00, 5000.00, 'Venta a crédito', 1),
(25, 10, 40, 18, NULL, '2026-07-29 12:56:53', 'VENTA_CREDITO', '40', 2500.00, 0.00, 2500.00, 'Venta a crédito', 1),
(28, 1, 34, 15, 14, '2026-07-29 00:00:00', 'COBRO', 'P-14', 0.00, 5000.00, 40000.00, 'Aplicación de pago', 1),
(29, 10, 41, 19, NULL, '2026-07-29 13:23:14', 'VENTA_CREDITO', '41', 500.00, 0.00, 500.00, 'Venta a crédito', 1),
(30, 10, 42, 20, NULL, '2026-07-29 13:23:28', 'VENTA_CREDITO', '42', 500.00, 0.00, 500.00, 'Venta a crédito', 1),
(35, 3, 32, 14, 19, '2026-07-29 00:00:00', 'COBRO', 'P-19', 0.00, 450.00, 4000.00, '1234', 1),
(40, 10, 50, 21, NULL, '2026-07-29 14:24:31', 'VENTA_CREDITO', '50', 8000.00, 0.00, 8000.00, 'Venta a crédito', 1),
(41, 3, 51, 22, NULL, '2026-07-29 14:27:56', 'VENTA_CREDITO', '51', 900.00, 0.00, 900.00, 'Venta a crédito', 1),
(45, 3, 51, 22, 25, '2026-07-29 00:00:00', 'COBRO', 'P-25', 0.00, 500.00, 4400.00, 'ninguna', 1),
(48, 3, 52, 23, NULL, '2026-07-29 14:49:34', 'VENTA_CREDITO', '52', 30000.00, 0.00, 30000.00, 'Venta a crédito', 1),
(58, 1, 34, 15, 37, '2026-07-30 00:00:00', 'COBRO', 'P-37', 0.00, 40000.00, 0.00, 'NA', 1);

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
(81, 2, 'SALIDA', 10.00, 'VENTA', 32, NULL, '2026-05-14 20:02:05'),
(82, 1, 'ENTRADA', 10000.00, 'COMPRA', NULL, 1, '2026-07-16 18:48:00'),
(83, 2, 'ENTRADA', 2000.00, 'COMPRA', NULL, 1, '2026-07-16 18:48:06'),
(84, 3, 'ENTRADA', 5000.00, 'COMPRA', NULL, 1, '2026-07-16 18:48:21'),
(85, 4, 'ENTRADA', 25000.00, 'COMPRA', NULL, 1, '2026-07-16 18:48:36'),
(86, 1, 'SALIDA', 10.00, 'VENTA', 33, 1, '2026-07-16 18:49:40'),
(87, 2, 'SALIDA', 20.00, 'VENTA', 33, 1, '2026-07-16 18:49:40'),
(88, 3, 'SALIDA', 5.00, 'VENTA', 33, 1, '2026-07-16 18:49:40'),
(89, 1, 'SALIDA', 20.00, 'VENTA', 34, 1, '2026-07-16 18:50:26'),
(90, 3, 'SALIDA', 50.00, 'VENTA', 34, 1, '2026-07-16 18:50:26'),
(91, 4, 'SALIDA', 50.00, 'VENTA', 34, 1, '2026-07-16 18:50:26'),
(92, 1, 'SALIDA', 110.00, 'VENTA', 35, 1, '2026-07-16 20:14:45'),
(93, 1, 'SALIDA', 1.00, 'VENTA', 36, 1, '2026-07-25 17:21:51'),
(94, 6, 'SALIDA', 100.00, 'VENTA', 36, 1, '2026-07-25 17:21:51'),
(95, 6, 'ENTRADA', 1000.00, 'ENTRADA', NULL, 1, '2026-07-29 18:13:16'),
(96, 1, 'SALIDA', 10.00, 'VENTA', 37, 1, '2026-07-29 18:38:56'),
(97, 1, 'SALIDA', 10.00, 'VENTA', 38, 1, '2026-07-29 18:39:13'),
(98, 1, 'SALIDA', 10.00, 'VENTA', 39, 1, '2026-07-29 18:39:25'),
(99, 1, 'SALIDA', 5.00, 'VENTA', 40, 1, '2026-07-29 18:56:53'),
(100, 1, 'SALIDA', 1.00, 'VENTA', 41, 1, '2026-07-29 19:23:14'),
(101, 1, 'SALIDA', 1.00, 'VENTA', 42, 1, '2026-07-29 19:23:28'),
(102, 1, 'SALIDA', 5.00, 'VENTA', 43, 1, '2026-07-29 19:24:17'),
(103, 1, 'SALIDA', 1.00, 'VENTA', 44, 1, '2026-07-29 19:24:29'),
(104, 1, 'SALIDA', 1.00, 'VENTA', 45, 1, '2026-07-29 19:24:49'),
(105, 2, 'SALIDA', 1.00, 'VENTA', 45, 1, '2026-07-29 19:24:49'),
(106, 1, 'SALIDA', 2.00, 'VENTA', 46, 1, '2026-07-29 19:25:11'),
(107, 2, 'SALIDA', 6.00, 'VENTA', 46, 1, '2026-07-29 19:25:11'),
(108, 3, 'SALIDA', 10.00, 'VENTA', 47, 1, '2026-07-29 19:27:03'),
(109, 1, 'SALIDA', 10.00, 'VENTA', 48, 1, '2026-07-29 19:31:00'),
(110, 1, 'SALIDA', 1.00, 'VENTA', 49, 1, '2026-07-29 20:23:58'),
(111, 2, 'SALIDA', 10.00, 'VENTA', 50, 1, '2026-07-29 20:24:31'),
(112, 6, 'SALIDA', 100.00, 'VENTA', 50, 1, '2026-07-29 20:24:31'),
(113, 2, 'SALIDA', 2.00, 'VENTA', 51, 1, '2026-07-29 20:27:56'),
(114, 1, 'ENTRADA', 100.00, 'entrada', NULL, 1, '2026-07-29 20:30:12'),
(115, 4, 'SALIDA', 100.00, 'VENTA', 52, 1, '2026-07-29 20:49:34');

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
-- Volcado de datos para la tabla `ordenes_venta`
--

INSERT INTO `ordenes_venta` (`id`, `folio`, `cliente_id`, `usuario_id`, `estado`, `observaciones`, `total_estimado`, `venta_id`, `creada_at`, `actualizada_at`, `convertida_at`) VALUES
(1, 'OV-00000001', 10, 1, 'CONVERTIDA', NULL, 2500.00, 40, '2026-07-29 18:56:14', '2026-07-29 18:56:53', '2026-07-29 12:56:53'),
(2, 'OV-00000002', 10, 1, 'CANCELADA', '123', 1000.00, NULL, '2026-07-29 19:01:18', '2026-07-29 20:22:34', NULL),
(3, 'OV-00000003', 10, 1, 'CANCELADA', '123', 450.00, NULL, '2026-07-29 19:01:50', '2026-07-29 20:22:33', NULL),
(4, 'OV-00000004', 10, 1, 'CONVERTIDA', NULL, 500.00, 44, '2026-07-29 19:24:24', '2026-07-29 19:24:29', '2026-07-29 13:24:29'),
(5, 'OV-00000005', 3, 1, 'CONVERTIDA', NULL, 9000.00, 51, '2026-07-29 20:27:25', '2026-07-29 20:27:56', '2026-07-29 14:27:56'),
(6, 'OV-00000006', 10, 1, 'CANCELADA', NULL, 5000.00, NULL, '2026-07-29 20:33:43', '2026-07-30 12:10:03', NULL),
(7, 'OV-00000007', 10, 1, 'CANCELADA', NULL, 500.00, NULL, '2026-07-29 20:50:15', '2026-07-30 12:10:01', NULL),
(8, 'OV-00000008', 10, 1, 'CANCELADA', NULL, 5000.00, NULL, '2026-07-29 20:50:20', '2026-07-29 20:51:41', NULL),
(9, 'OV-00000009', 10, 1, 'CANCELADA', NULL, 6100.00, NULL, '2026-07-29 21:07:12', '2026-07-30 12:09:59', NULL),
(10, 'OV-00000010', 10, 1, 'CANCELADA', NULL, 3500.00, NULL, '2026-07-29 21:07:28', '2026-07-30 12:09:57', NULL),
(11, 'OV-00000011', 9, 1, 'CANCELADA', NULL, 4000.00, NULL, '2026-07-30 12:09:26', '2026-07-30 12:09:55', NULL);

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
-- Volcado de datos para la tabla `pagos`
--

INSERT INTO `pagos` (`id`, `cliente_id`, `cuenta_id`, `monto`, `monto_total`, `metodo_pago`, `referencia`, `observaciones`, `usuario_id`, `fecha`, `estado`) VALUES
(2, NULL, NULL, NULL, NULL, 'EFECTIVO', NULL, NULL, NULL, '2026-04-30 20:23:58', 'ACTIVO'),
(5, 1, 3, 200.00, 200.00, 'EFECTIVO', NULL, NULL, NULL, '2026-04-30 20:50:03', 'ACTIVO'),
(6, 4, NULL, NULL, 500.00, 'EFECTIVO', NULL, NULL, 1, '2026-07-29 06:00:00', 'ACTIVO'),
(14, 1, NULL, NULL, 5000.00, 'EFECTIVO', NULL, NULL, 1, '2026-07-29 06:00:00', 'ACTIVO'),
(19, 3, NULL, NULL, 450.00, 'EFECTIVO', NULL, '1234', 1, '2026-07-29 06:00:00', 'ACTIVO'),
(25, 3, NULL, NULL, 500.00, 'EFECTIVO', NULL, 'ninguna', 1, '2026-07-29 06:00:00', 'ACTIVO'),
(37, 1, NULL, NULL, 40000.00, 'EFECTIVO', NULL, 'NA', 1, '2026-07-30 06:00:00', 'ACTIVO');

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
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `codigo`, `nombre`, `precio_venta`, `stock`, `stock_minimo`, `unidad`, `activo`, `creado_en`, `kilos_por_caja`) VALUES
(1, '01', 'aguacate extra x caja', 500.00, 9393.00, 0.00, 'CAJA', 1, '2026-04-30 20:48:13', NULL),
(2, '02', 'aguacate grande x caja', 450.00, 1326.00, 0.00, 'CAJA', 1, '2026-04-30 20:48:13', NULL),
(3, '03', 'aguacate mediano x caja', 400.00, 4156.00, 0.00, 'CAJA', 1, '2026-04-30 20:48:13', NULL),
(4, '04', 'aguacate tercera x caja', 300.00, 21471.00, 0.00, 'CAJA', 1, '2026-04-30 20:48:13', NULL),
(5, '07', 'agucate roña x caja', 600.00, 1500.00, 0.00, 'CAJA', 1, '2026-07-16 20:16:55', NULL),
(6, '06', 'aguacate x kilo', 35.00, 900.00, 0.00, 'kg', 1, '2026-07-16 18:30:23', NULL);

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
(1, 'Admin', 'admin', NULL, '$2b$12$QfQKTdP6.4wgRKaRFG90Au/inXIizuRs7wZuGUguA5vSBQ56kIGta', 'ADMON_GRAL', 1);

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
-- Volcado de datos para la tabla `ventas`
--

INSERT INTO `ventas` (`id`, `cliente_id`, `usuario_id`, `total`, `tipo_pago`, `metodo_pago`, `estado_pago`, `estado_venta`, `cancelada_por`, `cancelada_at`, `motivo_cancelacion`, `impresiones`, `ultima_impresion_at`, `fecha`) VALUES
(2, 1, 1, 725.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-04-30 20:15:45'),
(3, 1, 1, 250.00, 'CREDITO', 'EFECTIVO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-04-30 20:26:45'),
(4, 1, 1, 250.00, 'CREDITO', 'EFECTIVO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-04-30 20:27:53'),
(5, 1, 1, 250.00, 'CREDITO', 'EFECTIVO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-04-30 20:31:40'),
(8, 1, 1, 250.00, 'CREDITO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-04-30 20:48:42'),
(9, 1, 1, 165.00, 'CREDITO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-04-30 21:04:05'),
(10, 1, 1, 165.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-04-30 22:27:16'),
(11, 1, 1, 165.00, 'CREDITO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-04-30 22:27:35'),
(12, 1, 1, 330.00, 'CREDITO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-04-30 22:28:39'),
(13, 1, 1, 405.00, 'CREDITO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-07 18:33:25'),
(14, 1, 1, 400.00, 'CREDITO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-07 19:23:47'),
(15, 1, 1, 300.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-07 19:23:53'),
(16, 1, 1, 1340.00, 'CREDITO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-07 19:39:06'),
(17, 1, 1, 1340.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-07 19:43:33'),
(18, 3, 1, 165.00, 'CREDITO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-07 20:21:26'),
(19, NULL, 1, 30.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-07 20:30:09'),
(20, 3, 1, 8230.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-07 20:56:37'),
(21, 3, 1, 9000.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-08 13:44:29'),
(22, 9, 1, 24500.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 17:33:52'),
(23, NULL, 1, 35000.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 18:16:30'),
(24, NULL, 1, 69000.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 18:18:37'),
(25, 3, 1, 16530.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 18:43:25'),
(26, 1, 1, 450.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 18:54:57'),
(27, 1, 1, 5115.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 18:56:29'),
(28, 11, 1, 6950.00, 'CREDITO', 'EFECTIVO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 19:26:24'),
(29, 1, 1, 5000.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 19:35:42'),
(30, 4, 1, 9275.00, 'CREDITO', 'EFECTIVO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 19:54:40'),
(31, 3, 1, 4500.00, 'CREDITO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 19:55:13'),
(32, 3, 1, 4450.00, 'CREDITO', 'EFECTIVO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-05-14 20:02:04'),
(33, 1, 1, 16000.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 4, '2026-07-16 12:49:58', '2026-07-16 18:49:40'),
(34, 1, 1, 45000.00, 'CREDITO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-07-16 18:50:26'),
(35, 10, 1, 55000.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-07-16 20:14:45'),
(36, 3, 1, 4000.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 6, '2026-07-29 12:37:51', '2026-07-25 17:21:51'),
(37, 10, 1, 5000.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 1, '2026-07-29 12:39:04', '2026-07-29 18:38:56'),
(38, 10, 1, 5000.00, 'CREDITO', 'EFECTIVO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-07-29 18:39:13'),
(39, 10, 1, 5000.00, 'CREDITO', 'EFECTIVO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-07-29 18:39:25'),
(40, 10, 1, 2500.00, 'CREDITO', 'EFECTIVO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-07-29 18:56:53'),
(41, 10, 1, 500.00, 'CREDITO', 'EFECTIVO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-07-29 19:23:14'),
(42, 10, 1, 500.00, 'CREDITO', 'EFECTIVO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-07-29 19:23:28'),
(43, 10, 1, 2500.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-07-29 19:24:17'),
(44, 10, 1, 500.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-07-29 19:24:29'),
(45, 10, 1, 950.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-07-29 19:24:49'),
(46, 10, 1, 3700.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-07-29 19:25:11'),
(47, 10, 1, 4000.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-07-29 19:27:03'),
(48, 10, 1, 5000.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-07-29 19:31:00'),
(49, 10, 1, 500.00, 'CONTADO', 'EFECTIVO', 'PAGADO', 'ACTIVA', NULL, NULL, NULL, 1, '2026-07-29 14:35:15', '2026-07-29 20:23:58'),
(50, 10, 1, 8000.00, 'CREDITO', 'EFECTIVO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 1, '2026-07-29 14:24:34', '2026-07-29 20:24:31'),
(51, 3, 1, 900.00, 'CREDITO', 'EFECTIVO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 2, '2026-07-29 14:34:09', '2026-07-29 20:27:56'),
(52, 3, 1, 30000.00, 'CREDITO', 'EFECTIVO', 'PENDIENTE', 'ACTIVA', NULL, NULL, NULL, 0, NULL, '2026-07-29 20:49:34');

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=114;

--
-- AUTO_INCREMENT de la tabla `movimientos_cartera`
--
ALTER TABLE `movimientos_cartera`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `movimientos_inventario`
--
ALTER TABLE `movimientos_inventario`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=116;

--
-- AUTO_INCREMENT de la tabla `ordenes_venta`
--
ALTER TABLE `ordenes_venta`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de la tabla `pagos`
--
ALTER TABLE `pagos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT de la tabla `predicciones`
--
ALTER TABLE `predicciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `ventas`
--
ALTER TABLE `ventas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

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
