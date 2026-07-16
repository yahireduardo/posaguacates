const express = require('express');

const router = express.Router();

const db = require('../db/conexion');

/* =========================
   GEMINI IA
========================= */

const {

  GoogleGenerativeAI

} = require('@google/generative-ai');

/* =========================
   API KEY
========================= */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/* =========================
   MODELO
========================= */

const model =
genAI.getGenerativeModel({

model:'gemini-1.5-flash-latest'

});

/* =========================
   CHATBOT IA
========================= */

router.post('/',async(req,res)=>{

  try{

    const pregunta =
    req.body.pregunta;

    /* =========================
       DATOS NEGOCIO
    ========================= */

    db.query(`

      SELECT

        COUNT(*) as ventas,

        IFNULL(SUM(total),0)
        as ingresos

      FROM ventas

      WHERE estado_venta = 'ACTIVA'

    `,

    async(err,ventas)=>{

      if(err){
        return res.status(500).json(err);
      }

      db.query(`

        SELECT

          nombre,
          stock

        FROM productos

      `,

      async(err,productos)=>{

        if(err){
          return res.status(500).json(err);
        }

        /* =========================
           CONTEXTO IA
        ========================= */

        const contexto = `

Eres una IA empresarial
de un sistema POS
de aguacate Hass.

Información del negocio:

Ventas registradas:
${ventas[0].ventas}

Ingresos totales:
${ventas[0].ingresos}

Productos:

${productos.map(p=>

`${p.nombre}
Stock:${p.stock}`

).join('\n')}

Responde de manera
profesional, breve y clara.

Pregunta usuario:
${pregunta}

`;

        /* =========================
           GEMINI
        ========================= */

        const result =
        await model.generateContent(
          contexto
        );

        const respuesta =

          result.response.text();

        res.json({

          respuesta

        });

      });

    });

  }

  catch(error){

    console.log(error);

    res.json({

      respuesta:
      'Error en IA'

    });

  }

});

module.exports = router;
