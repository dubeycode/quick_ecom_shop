const express = require('express');
const schedulerAuth = require('../../middleware/schedulerAuth');
const { runScheduler } = require('../../services/schedulerService');

const router = express.Router();

router.post('/run', schedulerAuth, async (req, res, next) => {
  try {
    const dryRun = Boolean(req.body?.dryRun);
    const result = await runScheduler({ dryRun, triggeredBy: 'MANUAL' });

    if (result.skipped) {
      return res.json({ success: true, message: result.message, data: result });
    }

    res.json({
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
        dryRun: result.dryRun || false,
      },
    });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ success: false, message: err.message });
    }
    next(err);
  }
});

module.exports = router;
