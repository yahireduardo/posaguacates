const test = require('node:test');
const assert = require('node:assert/strict');
const { esBasePruebasAislada } = require('../lib/testDatabase');

test('acepta exclusivamente sufijos de bases de prueba conocidos', () => {
  assert.equal(esBasePruebasAislada('posaguacates_test'), true);
  assert.equal(esBasePruebasAislada('posaguacates_test_clean'), true);
  assert.equal(esBasePruebasAislada('posaguacates'), false);
  assert.equal(esBasePruebasAislada('posaguacates_test_backup'), false);
});
