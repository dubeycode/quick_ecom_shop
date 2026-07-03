function schedulerAuth(req, res, next) {
  const secret = req.headers['x-scheduler-secret'];
  const expected = process.env.SCHEDULER_SECRET_KEY;

  if (!expected || secret !== expected) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or missing scheduler secret',
    });
  }

  next();
}

module.exports = schedulerAuth;
