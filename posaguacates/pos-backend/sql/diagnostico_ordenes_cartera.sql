-- SOLO LECTURA. Ejecutar únicamente DESPUÉS de que termine correctamente
-- sql/migracion_ordenes_cartera.sql.
-- Todas las tablas están calificadas para no depender de la base seleccionada
-- en phpMyAdmin y no se consulta information_schema.
USE `posaguacates`;

-- Órdenes huérfanas.
SELECT ov.id,ov.folio
FROM `posaguacates`.`ordenes_venta` ov
LEFT JOIN `posaguacates`.`clientes` c ON c.id=ov.cliente_id
LEFT JOIN `posaguacates`.`usuarios` u ON u.id=ov.usuario_id
WHERE c.id IS NULL OR u.id IS NULL;

SELECT dov.id,dov.orden_id,dov.producto_id
FROM `posaguacates`.`detalle_orden_venta` dov
LEFT JOIN `posaguacates`.`ordenes_venta` ov ON ov.id=dov.orden_id
LEFT JOIN `posaguacates`.`productos` p ON p.id=dov.producto_id
WHERE ov.id IS NULL OR p.id IS NULL;

-- Órdenes convertidas sin venta o estados incompatibles.
SELECT ov.id,ov.folio,ov.estado,ov.venta_id
FROM `posaguacates`.`ordenes_venta` ov
LEFT JOIN `posaguacates`.`ventas` v ON v.id=ov.venta_id
WHERE (ov.estado='CONVERTIDA' AND v.id IS NULL)
   OR (ov.estado<>'CONVERTIDA' AND ov.venta_id IS NOT NULL);

-- Cuentas duplicadas.
SELECT venta_id,COUNT(*) cuentas
FROM `posaguacates`.`cuentas_por_cobrar`
GROUP BY venta_id HAVING COUNT(*)>1;

-- Pagos sin cuenta o sin aplicaciones.
SELECT p.id,p.cuenta_id,p.monto,p.cliente_id,p.monto_total
FROM `posaguacates`.`pagos` p
LEFT JOIN `posaguacates`.`cuentas_por_cobrar` c ON c.id=p.cuenta_id
WHERE (p.cuenta_id IS NOT NULL AND c.id IS NULL)
   OR (p.cuenta_id IS NULL AND NOT EXISTS (
     SELECT 1 FROM `posaguacates`.`aplicaciones_pago` ap WHERE ap.pago_id=p.id
   ));

-- Aplicaciones mayores al encabezado del pago.
SELECT p.id,p.monto_total,COALESCE(SUM(ap.monto_aplicado),0) aplicado
FROM `posaguacates`.`pagos` p
LEFT JOIN `posaguacates`.`aplicaciones_pago` ap ON ap.pago_id=p.id
GROUP BY p.id,p.monto_total,p.monto
HAVING aplicado>COALESCE(p.monto_total,p.monto);

-- Aplicaciones mayores al saldo original.
SELECT c.id,c.total_deuda,COALESCE(SUM(ap.monto_aplicado),0) aplicado
FROM `posaguacates`.`cuentas_por_cobrar` c
LEFT JOIN `posaguacates`.`aplicaciones_pago` ap ON ap.cuenta_id=c.id
GROUP BY c.id,c.total_deuda HAVING aplicado>c.total_deuda;

-- Ventas a crédito activas sin cuenta.
SELECT v.id,v.cliente_id,v.total
FROM `posaguacates`.`ventas` v
LEFT JOIN `posaguacates`.`cuentas_por_cobrar` c ON c.venta_id=v.id
WHERE v.tipo_pago='CREDITO' AND v.estado_venta='ACTIVA' AND c.id IS NULL;

-- Clientes con saldo inconsistente.
SELECT c.id,c.nombre_razon_social,
 COALESCE((SELECT SUM(x.saldo_pendiente)
   FROM `posaguacates`.`cuentas_por_cobrar` x
   WHERE x.cliente_id=c.id AND x.estado='PENDIENTE'),0) saldo_cuentas,
 COALESCE((SELECT mc.saldo_resultante
   FROM `posaguacates`.`movimientos_cartera` mc
   WHERE mc.cliente_id=c.id ORDER BY mc.fecha DESC,mc.id DESC LIMIT 1),0) saldo_libro
FROM `posaguacates`.`clientes` c
HAVING ABS(saldo_cuentas-saldo_libro)>0.005;

-- Productos vendidos que ya no existen.
SELECT dv.id,dv.venta_id,dv.producto_id
FROM `posaguacates`.`detalle_venta` dv
LEFT JOIN `posaguacates`.`productos` p ON p.id=dv.producto_id
WHERE p.id IS NULL;
