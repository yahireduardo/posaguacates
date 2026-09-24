const express = require("express");
const {
  getBusinessContext,
} = require("../services/businessIntelligenceService");
const {
  aiConfig,
  buildLocalAnswer,
  buildRecommendations,
  generateAnswer,
} = require("../services/aiService");

const router = express.Router();

router.get("/estado", (req, res) => {
  const config = aiConfig();
  res.json({
    disponible: true,
    modo: config.enabled ? "OPENAI_Y_LOCAL" : "LOCAL",
    modelo: config.enabled ? config.model : null,
    version_motor: "2.0",
    capacidades: [
      "ventas",
      "tendencias",
      "inventario",
      "cobertura",
      "reabasto",
      "cartera",
      "pronostico",
    ],
    privacidad:
      "Solo se procesan métricas agregadas; la clave permanece en el servidor.",
  });
});

router.get("/resumen", async (req, res, next) => {
  try {
    const context = await getBusinessContext();
    return res.json({
      resumen_ejecutivo: buildLocalAnswer(context),
      recomendaciones: buildRecommendations(context),
      metricas: context,
      metodo: "ANALISIS_LOCAL_EXPLICABLE_V2",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/recomendaciones", async (req, res, next) => {
  try {
    const context = await getBusinessContext();
    return res.json({
      recomendaciones: buildRecommendations(context),
      generado_en: context.generado_en,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/asistente", async (req, res, next) => {
  try {
    const context = await getBusinessContext();
    const result = await generateAnswer({
      question: req.body?.pregunta,
      context,
      userId: req.usuario?.id,
    });
    return res.json({
      respuesta: result.answer,
      proveedor: result.provider,
      modelo: result.model,
      advertencia: result.warning || null,
      generado_en: new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
