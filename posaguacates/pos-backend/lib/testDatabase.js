function esBasePruebasAislada(nombre) {
  return /_test(?:_clean)?$/i.test(String(nombre || ''));
}

module.exports = { esBasePruebasAislada };
