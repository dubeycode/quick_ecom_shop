const crypto = require('crypto');

function generateOrderId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `ORD-${date}-${suffix}`;
}

module.exports = generateOrderId;
