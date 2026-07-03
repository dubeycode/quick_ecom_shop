require('dotenv').config();

const connectDB = require('../../src/config/db');

let dbReady = false;

async function ensureDb() {
  if (!dbReady) {
    await connectDB();
    dbReady = true;
  }
}

function isAuthorized(req) {
  if (req.headers['x-vercel-cron'] === '1') {
    return true;
  }

  const secret = process.env.CRON_SECRET || process.env.SCHEDULER_SECRET_KEY;
  if (!secret) return false;

  const bearer = req.headers.authorization;
  const header = req.headers['x-scheduler-secret'];

  return bearer === `Bearer ${secret}` || header === secret;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or missing scheduler secret',
    });
  }

  try {
    await ensureDb();

    const { runScheduler } = require('../../src/services/schedulerService');
    const dryRun =
      req.body?.dryRun === true ||
      req.query?.dryRun === 'true';

    const result = await runScheduler({ dryRun, triggeredBy: 'CRON' });

    if (result.skipped) {
      return res.status(200).json({ success: true, message: result.message, data: result });
    }

    return res.status(200).json({
      success: true,
      message: dryRun ? 'Dry run completed' : 'Scheduler executed successfully',
      data: {
        runId: result.runId,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
        ordersScanned: result.ordersScanned,
        ordersUpdated: result.ordersUpdated,
        updates: result.updates,
        errors: result.errors,
      },
    });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ success: false, message: err.message });
    }
    console.error('Vercel cron scheduler error:', err);
    return res.status(500).json({ success: false, message: 'Scheduler failed' });
  }
};
