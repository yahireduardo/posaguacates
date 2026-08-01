-- Una venta a crédito todavía no tiene método de pago; este se registra al aplicar el abono.
ALTER TABLE ventas
  MODIFY COLUMN metodo_pago ENUM('EFECTIVO','TRANSFERENCIA','CHEQUE') NULL DEFAULT NULL;

UPDATE ventas SET metodo_pago=NULL, referencia_pago=NULL WHERE tipo_pago='CREDITO';
