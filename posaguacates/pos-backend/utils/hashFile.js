const fs = require('fs');
const crypto = require('crypto');

function hashFile(ruta, algoritmo = 'sha256') {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algoritmo);
    const entrada = fs.createReadStream(ruta);
    entrada.on('error', reject);
    entrada.on('data', chunk => hash.update(chunk));
    entrada.on('end', () => resolve(hash.digest('hex')));
  });
}

module.exports = { hashFile };
