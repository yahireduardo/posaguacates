const { spawn } = require('child_process');

function ejecutarProceso(executable, args, opciones = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      shell: false,
      windowsHide: true,
      stdio: opciones.stdoutPath ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'ignore', 'pipe']
    });
    let stderr = '';
    let salida;
    if (opciones.stdoutPath) {
      salida = require('fs').createWriteStream(opciones.stdoutPath, { flags: 'w' });
      child.stdout.pipe(salida);
    }
    if (opciones.stdinPath) {
      const entrada = require('fs').createReadStream(opciones.stdinPath);
      entrada.on('error', reject);
      entrada.pipe(child.stdin);
    } else if (child.stdin) {
      child.stdin.end();
    }
    child.stderr.on('data', chunk => {
      if (stderr.length < 8000) stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', code => {
      const terminar = () => code === 0
        ? resolve({ code })
        : reject(Object.assign(new Error('La herramienta de MariaDB terminó con error'), {
          code: 'MARIADB_COMMAND_FAILED',
          exitCode: code,
          stderr: stderr.slice(0, 500)
        }));
      if (salida) salida.end(terminar);
      else terminar();
    });
  });
}

module.exports = { ejecutarProceso };
