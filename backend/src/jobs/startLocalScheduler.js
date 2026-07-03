const { runScheduler } = require('../services/schedulerService');

const INTERVAL_MS = 5 * 60 * 1000;

function startLocalScheduler() {
  if (process.env.VERCEL || process.env.DISABLE_LOCAL_CRON === 'true') {
    return;
  }

  if (process.env.SCHEDULER_ENABLED === 'false') {
    console.log('[Scheduler] Disabled via SCHEDULER_ENABLED=false');
    return;
  }

  async function tick() {
    try {
      const result = await runScheduler({ triggeredBy: 'CRON' });
      if (result.skipped) {
        console.log('[Scheduler]', result.message);
        return;
      }
      console.log(
        `[Scheduler] Run ${result.runId} — scanned ${result.ordersScanned}, updated ${result.ordersUpdated}`
      );
    } catch (err) {
      console.error('[Scheduler] Failed:', err.message);
    }
  }

  const placedMin = process.env.PLACED_TO_PROCESSING_MINUTES || 5;
  const processingMin = process.env.PROCESSING_TO_READY_MINUTES || 5;

  console.log(
    `[Scheduler] Local cron active — every 5 min (PLACED→PROCESSING after ${placedMin}m, PROCESSING→READY after ${processingMin}m)`
  );

  setTimeout(tick, 8000);
  setInterval(tick, INTERVAL_MS);
}

module.exports = startLocalScheduler;
