function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'];
  const secret = process.env.ADMIN_SECRET_KEY;

  if (!secret || key !== secret) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or missing admin key',
    });
  }

  next();
}

module.exports = adminAuth;
