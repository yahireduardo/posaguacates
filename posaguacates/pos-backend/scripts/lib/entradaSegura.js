const readline = require('readline');

function preguntar(texto) {
  const interfaz = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => interfaz.question(texto, respuesta => {
    interfaz.close();
    resolve(respuesta.trim());
  }));
}

function preguntarOculto(texto) {
  if (!process.stdin.isTTY) {
    return Promise.reject(new Error('La contraseña debe capturarse desde una terminal interactiva'));
  }
  return new Promise((resolve, reject) => {
    process.stdout.write(texto);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    let valor = '';
    const terminar = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', leer);
      process.stdout.write('\n');
    };
    const leer = tecla => {
      if (tecla === '\u0003') {
        terminar();
        reject(new Error('Operación cancelada'));
      } else if (tecla === '\r' || tecla === '\n') {
        terminar();
        resolve(valor);
      } else if (tecla === '\u007f' || tecla === '\b') {
        valor = valor.slice(0, -1);
      } else if (tecla >= ' ') {
        valor += tecla;
      }
    };
    process.stdin.on('data', leer);
  });
}

function validarPassword(password) {
  if (password.length < 10) throw new Error('La contraseña debe tener al menos 10 caracteres');
  if (!/[a-záéíóúñ]/i.test(password) || !/\d/.test(password)) {
    throw new Error('La contraseña debe incluir letras y números');
  }
}

module.exports = { preguntar, preguntarOculto, validarPassword };
