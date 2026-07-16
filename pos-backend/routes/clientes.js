const express = require('express');

const router = express.Router();

const db = require('../db/conexion');

/* =========================
   OBTENER CLIENTES
========================= */

router.get('/', (req,res)=>{

  db.query(`
    SELECT * FROM clientes
    ORDER BY nombre ASC
  `,(err,result)=>{

    if(err){
      return res.status(500).json(err);
    }

    res.json(result);

  });

});

/* =========================
   CREAR CLIENTE
========================= */

router.post('/crear',(req,res)=>{

  const {
    nombre,
    telefono,
    direccion
  } = req.body;

  if(!nombre){

    return res.json({
      error:'Nombre obligatorio'
    });

  }

  db.query(`
    SELECT * FROM clientes
    WHERE nombre = ?
  `,[nombre],(err,existe)=>{

    if(existe.length > 0){

      return res.json({
        error:'El cliente ya existe'
      });

    }

    db.query(`
      INSERT INTO clientes
      (nombre,telefono,direccion)

      VALUES (?,?,?)
    `,

    [
      nombre,
      telefono,
      direccion
    ],

    (err,result)=>{

      if(err){
        return res.status(500).json(err);
      }

      res.json({
        mensaje:'Cliente creado'
      });

    });

  });

});

module.exports = router;