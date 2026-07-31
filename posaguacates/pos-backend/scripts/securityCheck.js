const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot })
  .toString('utf8').split('\0').filter(Boolean);
const failures = [];

const allowedEnv = /(?:^|\/)\.env\.(?:example|production\.example|test\.example)$/;
const forbiddenPath = file => {
  const normalized = file.replace(/\\/g, '/');
  if (/(?:^|\/)node_modules(?:\/|$)/.test(normalized)) return 'node_modules versionado';
  if (/(?:^|\/)\.env(?:\.|$)/.test(normalized) && !allowedEnv.test(normalized)) return '.env real versionado';
  if (/\.(?:zip|bak|backup|dump|sql\.gz|log)$/i.test(normalized)) return 'respaldo o log versionado';
  if (/(?:^|\/)(?:backups|logs?|data|temp|tmp|restore|restoration)(?:\/|$)/i.test(normalized)) return 'artefacto local versionado';
  if (/(?:^|\/)(?:instance-id|\.instance-id|\.maintenance)$/i.test(normalized)) return 'estado local versionado';
  if (/\.(?:pem|p12|pfx|key|credentials|cnf)$/i.test(normalized)) return 'credencial o clave versionada';
  return null;
};

for (const file of tracked) {
  const pathFailure = forbiddenPath(file);
  if (pathFailure) failures.push({ file, reason: pathFailure });

  const absolute = path.join(repoRoot, file);
  const stat = fs.statSync(absolute);
  if (stat.size > 2 * 1024 * 1024) continue;
  const buffer = fs.readFileSync(absolute);
  if (buffer.includes(0)) continue;
  const content = buffer.toString('utf8');

  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)) {
    failures.push({ file, reason: 'clave privada incluida' });
  }

  if (allowedEnv.test(file)) {
    for (const key of ['DB_PASSWORD', 'JWT_SECRET', 'GEMINI_API_KEY']) {
      const match = content.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`, 'mi'));
      if (!match) continue;
      const value = match[1].trim();
      const safe = !value || /(?:change|replace|example|test|fictici|generate|generar|opcional|vac[ií]o|your|<|>)/i.test(value);
      if (!safe) failures.push({ file, reason: `${key} no parece ficticio` });
    }
  }

  if (/sql\/posaguacates\.sql$/i.test(file) && /^\s*(?:INSERT|REPLACE|UPDATE|DELETE|LOAD\s+DATA)\b/im.test(content)) {
    failures.push({ file, reason: 'el esquema sanitizado contiene datos' });
  }
}

if (failures.length) {
  console.error('Security check rechazado:');
  for (const failure of failures) console.error(`- ${failure.file}: ${failure.reason}`);
  process.exit(1);
}

console.log(`Security check correcto: ${tracked.length} archivos versionados revisados sin secretos ni artefactos prohibidos.`);
