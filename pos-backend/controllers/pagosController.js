const db = require('../db/conexion');

exports.registrarPago = (req, res) => {
  const { cuenta_id, monto } = req.body;

  // 1. Guardar pago
  db.query(`
    INSERT INTO pagos (cuenta_id, monto, metodo_pago)
    VALUES (?, ?, 'EFECTIVO')
  `, [cuenta_id, monto], (err) => {
    if (err) return res.status(500).json(err);

    // 2. Restar saldo
    db.query(`
      UPDATE cuentas_por_cobrar
      SET saldo_pendiente = saldo_pendiente - ?
      WHERE id = ?
    `, [monto, cuenta_id]);

    // 3. Verificar si ya se pagó todo
    db.query(`
      SELECT saldo_pendiente FROM cuentas_por_cobrar
      WHERE id = ?
    `, [cuenta_id], (err, result) => {

      if (result[0].saldo_pendiente <= 0) {
        db.query(`
          UPDATE cuentas_por_cobrar
          SET estado = 'PAGADO'
          WHERE id = ?
        `, [cuenta_id]);
      }

      res.json({
        mensaje: 'Pago registrado correctamente'
      });
    });
  });
};