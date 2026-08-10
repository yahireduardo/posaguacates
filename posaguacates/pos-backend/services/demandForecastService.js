const path = require('path');
const { spawn } = require('child_process');

function pythonCommand(env = process.env) {
  return String(env.PYTHON_COMMAND || 'python').trim();
}

function runForecast(products, options = {}) {
  const spawnImpl = options.spawnImpl || spawn;
  const env = options.env || process.env;
  const timeoutMs = Math.min(120000, Math.max(3000, Number(env.ML_TIMEOUT_MS) || 30000));
  const script = path.join(__dirname, '..', 'ml', 'forecast.py');
  return new Promise((resolve, reject) => {
    const child = spawnImpl(pythonCommand(env), [script], {
      cwd: path.dirname(script), windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '', stderr = '', settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error ? reject(error) : resolve(value);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(Object.assign(new Error('El análisis con scikit-learn excedió el tiempo permitido'), { code: 'ML_TIMEOUT' }));
    }, timeoutMs);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
    child.on('error', error => finish(Object.assign(new Error(`Python no está disponible: ${error.message}`), { code: 'ML_UNAVAILABLE' })));
    child.on('close', code => {
      if (code !== 0) return finish(Object.assign(new Error(`El modelo no pudo ejecutarse${stderr ? `: ${stderr.trim()}` : ''}`), { code: 'ML_FAILED' }));
      try { return finish(null, JSON.parse(stdout)); }
      catch { return finish(Object.assign(new Error('El modelo devolvió una respuesta inválida'), { code: 'ML_INVALID_RESPONSE' })); }
    });
    child.stdin.end(JSON.stringify({ products }));
  });
}

module.exports = { pythonCommand, runForecast };
