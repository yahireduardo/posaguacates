const test = require('node:test');
const assert = require('node:assert/strict');
const { aiConfig, normalizeQuestion, buildLocalAnswer, buildRecommendations, generateAnswer } = require('../services/aiService');

const context = {
  resumen: { ventas_30d: 10, ingresos_30d: 2500, ticket_promedio: 250, deuda_pendiente: 500 },
  inventario: [{ id: 1, nombre: 'Hass', stock: 2, stock_minimo: 5, venta_semanal_promedio: 8 }],
  tendencias: [{ id: 2, nombre: 'Criollo', actual: 5, anterior: 10, variacion_porcentaje: -50 }]
};

test('IA queda en modo local cuando no hay clave', () => {
  assert.deepEqual(aiConfig({}), { enabled: false, model: 'gpt-5.6-luna', timeoutMs: 20000 });
  assert.match(buildLocalAnswer(context), /10 ventas/);
});

test('recomendaciones son explicables y nunca sugieren cantidad negativa', () => {
  const result = buildRecommendations(context);
  assert.equal(result.length, 2);
  assert.equal(result[0].prioridad, 'ALTA');
  assert.ok(result.every(item => item.cantidad_sugerida === undefined || item.cantidad_sugerida >= 0));
  assert.ok(result.every(item => item.evidencia));
});

test('preguntas se normalizan y limitan', () => {
  assert.equal(normalizeQuestion('  hola   mundo  '), 'hola mundo');
  assert.equal(normalizeQuestion('a'.repeat(800)).length, 500);
});

test('IA local responde según la intención de la pregunta', () => {
  assert.match(buildLocalAnswer(context, '¿Cuánto vendí?'), /10 ventas/);
  assert.match(buildLocalAnswer(context, '¿Cómo está el inventario?'), /Hass/);
  assert.match(buildLocalAnswer(context, '¿Cuánto me deben?'), /500/);
  assert.match(buildLocalAnswer(context, '¿Qué tendencia está bajando?'), /Criollo/);
});

test('asistente local no realiza solicitudes externas', async () => {
  let called = false;
  const result = await generateAnswer({ question: '¿Qué debo revisar?', context, env: {}, fetchImpl: async () => { called = true; } });
  assert.equal(result.provider, 'LOCAL');
  assert.equal(called, false);
});

test('asistente generativo usa Responses API sin almacenar la petición', async () => {
  let request;
  const result = await generateAnswer({
    question: 'Resume el negocio', context, userId: 7,
    env: { OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'test-model', OPENAI_TIMEOUT_MS: '3000' },
    fetchImpl: async (url, options) => { request = { url, options, body: JSON.parse(options.body) }; return { ok: true, json: async () => ({ id: 'resp_1', output_text: 'Todo en orden.' }) }; }
  });
  assert.equal(result.provider, 'OPENAI');
  assert.equal(request.url, 'https://api.openai.com/v1/responses');
  assert.equal(request.body.store, false);
  assert.equal(request.body.safety_identifier, 'pos-user-7');
  assert.equal(request.options.headers.Authorization, 'Bearer test-key');
});

test('asistente vuelve al modo local si OpenAI no tiene créditos', async () => {
  const result = await generateAnswer({ question: '¿Cuánto vendí?', context, env: { OPENAI_API_KEY: 'test-key' }, fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({ error: { type: 'insufficient_quota', code: 'credit_balance_exhausted' } }) }) });
  assert.equal(result.provider, 'LOCAL_FALLBACK');
  assert.match(result.warning, /no tiene créditos/);
  assert.match(result.answer, /10 ventas/);
});
