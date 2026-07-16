const express = require('express');

const router = express.Router();

const db = require('../db/conexion');

/* =========================
   OBTENER CLIENTES DEUDORES
========================= */

router.get('/',(req,res)=>{

  db.query(`

    SELECT

      c.id as cliente_id,
      c.nombre,

      SUM(cxc.saldo_pendiente)
      as saldo_total

    FROM cuentas_por_cobrar cxc

    INNER JOIN clientes c
    ON c.id = cxc.cliente_id

    WHERE cxc.estado != 'PAGADO'

    GROUP BY c.id

    ORDER BY saldo_total DESC

  `,(err,result)=>{

    if(err){
      return res.status(500).json(err);
    }

    res.json(result);

  });

});

/* =========================
   DETALLE CLIENTE
========================= */

router.get('/cliente/:id',(req,res)=>{

  const clienteId = req.params.id;

  db.query(`

    SELECT

      cxc.id,
      cxc.venta_id,
      cxc.total_deuda,
      cxc.saldo_pendiente,
      cxc.estado,
      v.fecha

    FROM cuentas_por_cobrar cxc

    INNER JOIN ventas v
    ON v.id = cxc.venta_id

    WHERE
    cxc.cliente_id = ?
    AND cxc.estado != 'PAGADO'

    ORDER BY cxc.id DESC

  `,

  [clienteId],

  (err,result)=>{

    if(err){
      return res.status(500).json(err);
    }

    res.json(result);

  });

});

/* =========================
   REGISTRAR PAGO
========================= */

router.post('/abonar',(req,res)=>{

  const {
    cuenta_id,
    monto
  } = req.body;

  db.query(`

    SELECT *
    FROM cuentas_por_cobrar
    WHERE id = ?

  `,[cuenta_id],(err,result)=>{

    if(err){
      return res.status(500).json(err);
    }

    if(result.length === 0){

      return res.json({
        error:'Cuenta no encontrada'
      });

    }

    const cuenta = result[0];

    if(cuenta.estado === 'PAGADO'){

      return res.json({
        error:'La cuenta ya está liquidada'
      });

    }

    if(parseFloat(monto) >
    parseFloat(cuenta.saldo_pendiente)){

      return res.json({
        error:'El abono supera el saldo pendiente'
      });

    }

    let nuevoSaldo =
      cuenta.saldo_pendiente - monto;

    let estado = 'PENDIENTE';

    if(nuevoSaldo <= 0){

      nuevoSaldo = 0;

      estado = 'PAGADO';

    }

    db.query(`

      UPDATE cuentas_por_cobrar

      SET
      saldo_pendiente = ?,
      estado = ?

      WHERE id = ?

    `,

    [
      nuevoSaldo,
      estado,
      cuenta_id
    ],

    (err)=>{

      if(err){
        return res.status(500).json(err);
      }

      res.json({
        mensaje:'Pago registrado'
      });

    });

  });

});

module.exports = router;