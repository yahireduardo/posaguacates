const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const yauzl = require('yauzl');

const PERMITIDOS = new Set(['backup.sql', 'manifest.json']);

function validarNombre(nombre) {
  const normalizado = nombre.replace(/\\/g, '/');
  if (!PERMITIDOS.has(normalizado) || path.posix.basename(normalizado) !== normalizado) {
    throw Object.assign(new Error('El ZIP contiene archivos o rutas no permitidos'), { status: 400 });
  }
}

async function extraerZipSeguro(zipPath, destino, maxBytes) {
  await fsp.mkdir(destino, { recursive: true });
  const zip = await yauzl.openPromise(zipPath, {
    lazyEntries: true,
    decodeStrings: true,
    validateEntrySizes: true,
    strictFileNames: true
  });
  const encontrados = new Set();
  let total = 0;
  try {
    for await (const entry of zip.eachEntry()) {
      validarNombre(entry.fileName);
      if (encontrados.has(entry.fileName)) throw Object.assign(new Error('El ZIP contiene archivos duplicados'), { status: 400 });
      const tipoUnix = (entry.externalFileAttributes >>> 16) & 0o170000;
      if (tipoUnix === 0o120000) throw Object.assign(new Error('No se permiten enlaces en el ZIP'), { status: 400 });
      total += entry.uncompressedSize;
      if (total > maxBytes) throw Object.assign(new Error('El respaldo excede el tamaño permitido'), { status: 413 });
      encontrados.add(entry.fileName);
      const stream = await zip.openReadStreamPromise(entry);
      const salida = path.join(destino, entry.fileName);
      await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(salida, { flags: 'wx', mode: 0o600 });
        stream.on('error', reject);
        out.on('error', reject);
        out.on('finish', resolve);
        stream.pipe(out);
      });
    }
  } finally {
    zip.close();
  }
  if (!encontrados.has('backup.sql') || !encontrados.has('manifest.json') || encontrados.size !== 2) {
    throw Object.assign(new Error('El ZIP debe contener únicamente backup.sql y manifest.json'), { status: 400 });
  }
  return {
    sqlPath: path.join(destino, 'backup.sql'),
    manifestPath: path.join(destino, 'manifest.json')
  };
}

module.exports = { extraerZipSeguro, validarNombre };
