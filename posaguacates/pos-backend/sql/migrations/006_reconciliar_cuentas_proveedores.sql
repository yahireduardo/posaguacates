-- Repara compras activas creadas por versiones anteriores sin cuenta por pagar.
INSERT INTO cuentas_por_pagar_proveedores
  (compra_id,proveedor_id,total_deuda,saldo_pendiente,estado,fecha)
SELECT c.id,c.proveedor_id,c.total,c.total,
       CASE WHEN c.total=0 THEN 'PAGADA' ELSE 'PENDIENTE' END,c.fecha
FROM compras c
LEFT JOIN cuentas_por_pagar_proveedores cpp ON cpp.compra_id=c.id
WHERE c.estado='ACTIVA' AND cpp.id IS NULL
ON DUPLICATE KEY UPDATE compra_id=VALUES(compra_id);
