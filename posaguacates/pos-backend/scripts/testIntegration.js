require('dotenv').config({ path: '.env.test' });
const { spawnSync } = require('child_process');

const database = String(process.env.DB_NAME || '');
if (process.env.NODE_ENV !== 'test' || process.env.TEST_DATABASE !== 'true' || !/_test$/i.test(database)) {
  console.error('PRUEBAS RECHAZADAS: use NODE_ENV=test, TEST_DATABASE=true y DB_NAME terminado en _test.');
  process.exit(2);
}
const result = spawnSync(process.execPath, ['--test', 'test/integration'], { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
