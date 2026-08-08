const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

async function obtenerSidWindows(ejecutar = execFileAsync) {
  const { stdout = '' } = await ejecutar('whoami.exe', ['/user', '/fo', 'csv', '/nh'], { windowsHide: true });
  const sid = String(stdout).match(/S-\d(?:-\d+)+/i)?.[0];
  if (!sid) throw new Error('No se pudo identificar el SID de la cuenta del servicio');
  return sid;
}

function escaparIni(valor) {
  return `"${String(valor ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '')}"`;
}

async function crearCredencialesTemporales(config, opciones = {}) {
  const mkdtemp = opciones.mkdtemp || fs.mkdtemp;
  const writeFile = opciones.writeFile || fs.writeFile;
  const chmod = opciones.chmod || fs.chmod;
  const base = opciones.base || os.tmpdir();
  const directorio = await mkdtemp(path.join(base, 'pos-db-'));
  const ruta = path.join(directorio, 'client.cnf');
  const contenido = [
    '[client]',
    `user=${escaparIni(config.user)}`,
    `password=${escaparIni(config.password)}`,
    `host=${escaparIni(config.host)}`,
    `port=${Number(config.port)}`,
    ''
  ].join('\n');
  try {
    await writeFile(ruta, contenido, { encoding: 'utf8', mode: 0o600 });
    await chmod(ruta, 0o600);
    const entornoPruebaAislado = process.env.NODE_ENV === 'test'
      && process.env.TEST_DATABASE === 'true' && /_test$/i.test(process.env.DB_NAME || '');
    if (process.platform === 'win32' && opciones.protegerWindows !== false && !entornoPruebaAislado) {
      const ejecutar = opciones.execFile || execFileAsync;
      const sid = await obtenerSidWindows(ejecutar);
      await ejecutar('icacls.exe', [
        ruta, '/inheritance:r', '/grant:r', `*${sid}:(F)`
      ], { windowsHide: true });
    }
    return { directorio, ruta };
  } catch (error) {
    await (opciones.rm || fs.rm)(directorio, { recursive: true, force: true });
    throw error;
  }
}

async function eliminarCredencialesTemporales(credenciales, opciones = {}) {
  if (!credenciales?.directorio) return;
  const rm = opciones.rm || fs.rm;
  try {
    await rm(credenciales.directorio, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 });
  } catch (error) {
    if (!['EPERM', 'EBUSY'].includes(error.code)) throw error;
    try { await (opciones.chmod || fs.chmod)(credenciales.ruta, 0o600); } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 250));
    await rm(credenciales.directorio, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  }
}

module.exports = { crearCredencialesTemporales, eliminarCredencialesTemporales, obtenerSidWindows };
