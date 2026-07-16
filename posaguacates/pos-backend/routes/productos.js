const express = require('express');

const router = express.Router();

const db = require('../db/conexion');

/* =========================
   OBTENER PRODUCTOS
========================= */

router.get('/',(req,res)=>{

  db.query(`

    SELECT *
    FROM productos

    WHERE activo = 1

    ORDER BY nombre ASC

  `,(err,result)=>{

    if(err){
      return res.status(500).json(err);
    }

    res.json(result);

  });

});

/* =========================
   STOCK BAJO
========================= */

router.get('/stock-bajo',(req,res)=>{

  db.query(`

    SELECT *

    FROM productos

    WHERE stock <= stock_minimo

    ORDER BY stock ASC

  `,(err,result)=>{

    if(err){
      return res.status(500).json(err);
    }

    res.json(result);

  });

});

module.exports = router;