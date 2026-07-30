const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

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
    if (process.platform === 'win32' && opciones.protegerWindows !== false) {
      const cuenta = process.env.USERDOMAIN && process.env.USERNAME
        ? `${process.env.USERDOMAIN}\\${process.env.USERNAME}`
        : process.env.USERNAME;
      if (!cuenta) throw new Error('No se pudo identificar la cuenta del servicio para proteger credenciales');
      await (opciones.execFile || execFileAsync)('icacls.exe', [
        ruta, '/inheritance:r', '/grant:r', `${cuenta}:(R,W)`
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
  await (opciones.rm || fs.rm)(credenciales.directorio, { recursive: true, force: true });
}

module.exports = { crearCredencialesTemporales, eliminarCredencialesTemporales };
