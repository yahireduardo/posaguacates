const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const frontend = path.join(__dirname, '..', '..', 'pos-frontend');
test('las imágenes tienen texto alternativo y los errores de login se anuncian', () => {
  const html = fs.readFileSync(path.join(frontend, 'index.html'), 'utf8');
  assert.equal([...html.matchAll(/<img\b[^>]*>/g)].filter(x => !/\balt=/.test(x[0])).length, 0);
  assert.match(html, /id="loginError"[^>]*role="alert"/);
});

test('el frontend asigna nombre accesible a campos y semántica a modales', () => {
  const js = fs.readFileSync(path.join(frontend, 'js', 'app.js'), 'utf8');
  assert.match(js, /prepararAccesibilidadBasica/);
  assert.match(js, /aria-modal/);
  assert.match(js, /aria-label/);
});
