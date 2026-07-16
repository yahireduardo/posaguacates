-- Solo lectura. Ejecutar antes de aplicar cualquier migracion.
SELECT id, codigo, nombre, stock FROM productos WHERE stock < 0;

SELECT v.id AS venta_id
FROM ventas v
LEFT JOIN cuentas_por_cobrar cxc ON cxc.venta_id = v.id
WHERE v.tipo_pago = 'CREDITO' AND v.estado_venta = 'ACTIVA' AND cxc.id IS NULL;

SELECT venta_id, COUNT(*) AS cuentas
FROM cuentas_por_cobrar GROUP BY venta_id HAVING COUNT(*) > 1;

SELECT p.id AS pago_id, p.cuenta_id
FROM pagos p LEFT JOIN cuentas_por_cobrar cxc ON cxc.id = p.cuenta_id
WHERE cxc.id IS NULL;

SELECT id, username FROM usuarios WHERE password_hash IS NULL OR password_hash = '';

SELECT v.id AS venta_id
FROM ventas v LEFT JOIN detalle_venta dv ON dv.venta_id = v.id
WHERE dv.id IS NULL;

SELECT id, producto_id, referencia_id, fecha
FROM movimientos_inventario WHERE usuario_id IS NULL;

SELECT UPPER(TRIM(rfc)) AS rfc_normalizado, COUNT(*) AS repeticiones
FROM clientes
WHERE rfc IS NOT NULL AND TRIM(rfc) <> ''
GROUP BY UPPER(TRIM(rfc)) HAVING COUNT(*) > 1;

