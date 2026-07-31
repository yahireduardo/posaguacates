require('dotenv').config({ path: '.env', quiet: true });
require('dotenv').config({ path: '.env.test', override: true, quiet: true });
const { spawnSync } = require('child_process');
const { esBasePruebasAislada } = require('../lib/testDatabase');

const database = String(process.env.DB_NAME || '');
if (process.env.NODE_ENV !== 'test' || process.env.TEST_DATABASE !== 'true' || !esBasePruebasAislada(database)) {
  console.error('PRUEBAS RECHAZADAS: use NODE_ENV=test, TEST_DATABASE=true y una base terminada en _test o _test_clean.');
  process.exit(2);
}
const result = spawnSync(process.execPath, ['--test', 'integration-tests/flow.js'], { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
