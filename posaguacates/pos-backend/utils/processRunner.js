const { spawn } = require('child_process');
const fs = require('fs');

function ejecutarProceso(executable, args, opciones = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      shell: false, windowsHide: true,
      stdio: opciones.stdoutPath ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'ignore', 'pipe']
    });
    let stderr = '';
    let salida;
    let settled = false;
    const fail = error => { if (!settled) { settled = true; reject(error); } };
    const ok = code => { if (!settled) { settled = true; resolve({ code }); } };
    if (opciones.stdoutPath) {
      salida = fs.createWriteStream(opciones.stdoutPath, { flags: 'w' });
      salida.on('error', fail);
      child.stdout.pipe(salida);
    }
    if (opciones.stdinPath) {
      const entrada = fs.createReadStream(opciones.stdinPath);
      entrada.on('error', fail);
      entrada.pipe(child.stdin);
    } else if (child.stdin) child.stdin.end();
    child.stderr.on('data', chunk => { if (stderr.length < 8000) stderr += chunk.toString(); });
    child.on('error', fail);
    child.on('close', code => {
      if (code !== 0) return fail(Object.assign(new Error('La herramienta de MariaDB terminó con error'), {
        code: 'MARIADB_COMMAND_FAILED', exitCode: code, stderr: stderr.slice(0, 500)
      }));
      if (!salida || salida.writableFinished) return ok(code);
      salida.once('finish', () => ok(code));
    });
  });
}

module.exports = { ejecutarProceso };
