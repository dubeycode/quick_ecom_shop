const crypto = require('crypto');

function generateProviderId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `PROV-${date}-${suffix}`;
}

module.exports = generateProviderId;
