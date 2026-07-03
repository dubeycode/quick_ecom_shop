const { verifyProviderToken } = require('../utils/providerToken');
const Provider = require('../models/Provider');

async function providerAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Login required' });
  }

  try {
    const token = authHeader.slice(7);
    const payload = verifyProviderToken(token);
    const provider = await Provider.findOne({ providerId: payload.providerId, isActive: true });
    if (!provider) {
      return res.status(401).json({ success: false, message: 'Provider account not found' });
    }
    req.provider = provider;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }
}

module.exports = providerAuth;
