const express = require('express');

const router = express.Router();

const db = require('../db/conexion');
const { getBusinessContext } = require('../services/businessIntelligenceService');
const { aiConfig, buildLocalAnswer, buildRecommendations, generateAnswer } = require('../services/aiService');

router.get('/estado', (req, res) => {
  const config = aiConfig();
  res.json({
    disponible: true,
    modo: config.enabled ? 'OPENAI_Y_LOCAL' : 'LOCAL',
    modelo: config.enabled ? config.model : null,
    privacidad: 'Solo se procesan métricas agregadas; la clave permanece en el servidor.'
  });
});

router.get('/resumen', async (req, res, next) => {
  try {
    const context = await getBusinessContext();
    return res.json({
      resumen_ejecutivo: buildLocalAnswer(context),
      recomendaciones: buildRecommendations(context),
      metricas: context,
      metodo: 'ANALISIS_LOCAL_EXPLICABLE'
    });
  } catch (error) { return next(error); }
});

router.get('/recomendaciones', async (req, res, next) => {
  try {
    const context = await getBusinessContext();
    return res.json({ recomendaciones: buildRecommendations(context), generado_en: context.generado_en });
  } catch (error) { return next(error); }
});

router.post('/asistente', async (req, res, next) => {
  try {
    const context = await getBusinessContext();
    const result = await generateAnswer({ question: req.body?.pregunta, context, userId: req.usuario?.id });
    return res.json({ respuesta: result.answer, proveedor: result.provider, modelo: result.model, advertencia: result.warning || null, generado_en: new Date().toISOString() });
  } catch (error) { return next(error); }
});

/* =========================
   IA AVANZADA
========================= */

router.get('/analisis',(req,res)=>{

  db.query(`

    SELECT

      p.nombre,

      SUM(dv.cantidad) as vendidos,

       p.stock

    FROM detalle_venta dv

    INNER JOIN ventas v
    ON v.id = dv.venta_id

    INNER JOIN productos p
    ON p.id = dv.producto_id

    WHERE v.estado_venta = 'ACTIVA'

    GROUP BY p.id, p.nombre, p.stock

    ORDER BY vendidos DESC

  `,(err,result)=>{

    if(err){
      return res.status(500).json(err);
    }

    let mensajes = [];

    /* =========================
       MÁS VENDIDO
    ========================= */

    if(result.length > 0){

      mensajes.push(

        `📈 ${result[0].nombre}
        es el producto más vendido`

      );

    }

    /* =========================
       STOCK BAJO
    ========================= */

    result.forEach(p=>{

      if(p.stock <= 20){

        mensajes.push(

          `⚠️ Se recomienda surtir
          ${p.nombre}`

        );

      }

    });

    /* =========================
       POCO MOVIMIENTO
    ========================= */

    result.forEach(p=>{

      if(p.vendidos <= 5){

        mensajes.push(

          `📉 ${p.nombre}
          tiene pocas ventas`

        );

      }

    });

    res.json(mensajes);

  });

});

module.exports = router;
