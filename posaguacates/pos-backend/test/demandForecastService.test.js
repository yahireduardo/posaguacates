const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');
const { pythonCommand, runForecast } = require('../services/demandForecastService');

test('permite configurar el ejecutable de Python', () => {
  assert.equal(pythonCommand({ PYTHON_COMMAND: 'py' }), 'py');
  assert.equal(pythonCommand({}), 'python');
});

test('envía series al proceso y procesa su JSON', async () => {
  let input = '';
  const spawnImpl = () => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
    child.stdin = { end(value) { input = value; process.nextTick(() => { child.stdout.emit('data', '{"products":[]}'); child.emit('close', 0); }); } };
    child.kill = () => {};
    return child;
  };
  const result = await runForecast([{ product_id: 1, values: [1, 2] }], { spawnImpl, env: { ML_TIMEOUT_MS: 3000 } });
  assert.deepEqual(result, { products: [] });
  assert.deepEqual(JSON.parse(input).products[0].values, [1, 2]);
});
