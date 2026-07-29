const bcrypt = require('bcryptjs');

async function passwordAdminValida(password, passwordHash) {
  if (!password || !passwordHash) return false;
  return bcrypt.compare(String(password), String(passwordHash));
}

module.exports = { passwordAdminValida };
