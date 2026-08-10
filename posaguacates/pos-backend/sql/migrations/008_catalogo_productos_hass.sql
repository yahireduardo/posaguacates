-- Catálogo base solicitado. Conserva stock, costo y proveedor de códigos existentes.
INSERT INTO productos
  (codigo,nombre,descripcion,precio_venta,costo,stock,stock_minimo,unidad,kilos_por_caja,proveedor_id,activo)
VALUES
  ('01','Aguacate Hass Grande x Caja de 10k','Caja de 10 kg',530,0,0,0,'CAJA',10,NULL,1),
  ('02','Aguacate Hass Mediano x Caja de 10k','Caja de 10 kg',450,0,0,0,'CAJA',10,NULL,1),
  ('03','Aguacate Hass Extra x Caja de 10k','Caja de 10 kg',540,0,0,0,'CAJA',10,NULL,1),
  ('05','Aguacate Hass Tercera x Caja de 10k','Caja de 10 kg',415,0,0,0,'CAJA',10,NULL,1),
  ('06','Aguacate Hass x Kilo','Venta por kilogramo',40,0,0,0,'KG',NULL,NULL,1),
  ('09','Aguacate Hass Roña Grande/Mediano x Caja de 10k','Caja de 10 kg',510,0,0,0,'CAJA',10,NULL,1)
ON DUPLICATE KEY UPDATE
  nombre=VALUES(nombre),
  descripcion=VALUES(descripcion),
  precio_venta=VALUES(precio_venta),
  unidad=VALUES(unidad),
  kilos_por_caja=VALUES(kilos_por_caja),
  activo=1;
