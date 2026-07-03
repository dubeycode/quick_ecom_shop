const jwt = require('jsonwebtoken');

function getSecret() {
  return process.env.PROVIDER_JWT_SECRET || 'dev-provider-jwt-secret';
}

function signProviderToken(provider) {
  return jwt.sign(
    { providerId: provider.providerId, phone: provider.phone, name: provider.name },
    getSecret(),
    { expiresIn: '7d' }
  );
}

function verifyProviderToken(token) {
  return jwt.verify(token, getSecret());
}

module.exports = { signProviderToken, verifyProviderToken };
