const express = require('express');

const router = express.Router();

const db = require('../db/conexion');

/* =========================
   LOGIN
========================= */

router.post('/login',(req,res)=>{

  const {
    usuario,
    password
  } = req.body;

  db.query(`

    SELECT *

    FROM usuarios

    WHERE
    usuario = ?
    AND password = ?
    AND activo = 1

  `,

  [
    usuario,
    password
  ],

  (err,result)=>{

    if(err){
      return res.status(500).json(err);
    }

    if(result.length === 0){

      return res.json({
        error:'Usuario incorrecto'
      });

    }

    res.json({

      mensaje:'Login correcto',

      usuario:result[0]

    });

  });

});

module.exports = router;