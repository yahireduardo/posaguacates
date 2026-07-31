-- Sustituya @cliente_id solo en una sesión administrativa de diagnóstico.
SET @cliente_id = 0;

SELECT * FROM clientes WHERE id = @cliente_id;
SELECT * FROM ventas WHERE cliente_id = @cliente_id ORDER BY id;
SELECT dv.*
FROM detalle_venta dv
JOIN ventas v ON v.id = dv.venta_id
WHERE v.cliente_id = @cliente_id
ORDER BY dv.venta_id, dv.id;
SELECT * FROM cuentas_por_cobrar WHERE cliente_id = @cliente_id ORDER BY id;
SELECT DISTINCT p.*
FROM pagos p
LEFT JOIN aplicaciones_pago ap ON ap.pago_id = p.id
LEFT JOIN cuentas_por_cobrar cxc ON cxc.id = ap.cuenta_id
LEFT JOIN cuentas_por_cobrar pcxc ON pcxc.id = p.cuenta_id
WHERE p.cliente_id = @cliente_id
   OR cxc.cliente_id = @cliente_id
   OR pcxc.cliente_id = @cliente_id
ORDER BY p.id;
SELECT ap.*
FROM aplicaciones_pago ap
JOIN cuentas_por_cobrar cxc ON cxc.id = ap.cuenta_id
WHERE cxc.cliente_id = @cliente_id
ORDER BY ap.id;
SELECT * FROM ordenes_venta WHERE cliente_id = @cliente_id ORDER BY id;
SELECT dov.*
FROM detalle_orden_venta dov
JOIN ordenes_venta ov ON ov.id = dov.orden_id
WHERE ov.cliente_id = @cliente_id
ORDER BY dov.orden_id, dov.id;
SELECT * FROM movimientos_cartera WHERE cliente_id = @cliente_id ORDER BY id;
SELECT mi.*
FROM movimientos_inventario mi
JOIN ventas v ON v.id = mi.referencia_id
WHERE v.cliente_id = @cliente_id
  AND mi.motivo IN ('VENTA','CANCELACION_VENTA','ELIMINACION_CLIENTE_PRUEBAS')
ORDER BY mi.id;
