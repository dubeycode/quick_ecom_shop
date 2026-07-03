const Order = require('../models/Order');
const StatusHistory = require('../models/StatusHistory');
const SchedulerLog = require('../models/SchedulerLog');
const SchedulerLock = require('../models/SchedulerLock');
const generateRunId = require('../utils/generateRunId');

const LOCK_ID = 'order_scheduler';
const LOCK_TTL_MS = 5 * 60 * 1000;

function getConfig() {
  return {
    placedMinutes: parseInt(process.env.PLACED_TO_PROCESSING_MINUTES, 10) || 5,
    processingMinutes: parseInt(process.env.PROCESSING_TO_READY_MINUTES, 10) || 5,
    enabled: process.env.SCHEDULER_ENABLED !== 'false',
  };
}

function cutoffMinutes(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

async function acquireLock(runId) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_TTL_MS);

  await SchedulerLock.updateOne(
    { _id: LOCK_ID },
    { $setOnInsert: { lockedAt: new Date(0), lockedBy: null, expiresAt: new Date(0) } },
    { upsert: true }
  );

  const result = await SchedulerLock.updateOne(
    { _id: LOCK_ID, expiresAt: { $lt: now } },
    { $set: { lockedAt: now, lockedBy: runId, expiresAt } }
  );

  return result.modifiedCount === 1;
}

async function releaseLock(runId) {
  await SchedulerLock.updateOne(
    { _id: LOCK_ID, lockedBy: runId },
    { $set: { expiresAt: new Date() } }
  );
}

async function transitionOrder(orderId, fromStatus, toStatus, reason, dryRun) {
  if (dryRun) {
    const exists = await Order.exists({ orderId, orderStatus: fromStatus });
    return exists ? { orderId, fromStatus, toStatus, reason } : null;
  }

  const order = await Order.findOneAndUpdate(
    { orderId, orderStatus: fromStatus },
    { $set: { orderStatus: toStatus } },
    { new: true }
  );

  if (!order) return null;

  await StatusHistory.create({
    orderId,
    fromStatus,
    toStatus,
    changedBy: 'SCHEDULER',
    note: reason,
  });

  return { orderId, fromStatus, toStatus, reason };
}

async function processTransition(fromStatus, toStatus, minutes, reason, dryRun) {
  const cutoff = cutoffMinutes(minutes);
  const timeField = fromStatus === 'PLACED' ? 'createdAt' : 'updatedAt';
  const orders = await Order.find({
    orderStatus: fromStatus,
    [timeField]: { $lte: cutoff },
  }).select('orderId');

  const updates = [];
  const errors = [];

  for (const { orderId } of orders) {
    try {
      const update = await transitionOrder(orderId, fromStatus, toStatus, reason, dryRun);
      if (update) updates.push(update);
    } catch (err) {
      errors.push({ orderId, message: err.message });
    }
  }

  return { scanned: orders.length, updates, errors };
}

async function runScheduler({ dryRun = false, triggeredBy = 'CRON' } = {}) {
  const config = getConfig();
  const runId = generateRunId();
  const startedAt = new Date();

  if (!config.enabled) {
    return {
      runId,
      startedAt,
      completedAt: new Date(),
      ordersScanned: 0,
      ordersUpdated: 0,
      updates: [],
      errors: [],
      skipped: true,
      message: 'Scheduler is disabled',
    };
  }

  let lockHeld = false;

  if (!dryRun) {
    lockHeld = await acquireLock(runId);
    if (!lockHeld) {
      const err = new Error('Scheduler is already running');
      err.statusCode = 409;
      throw err;
    }
  }

  try {
    const placed = await processTransition(
      'PLACED',
      'PROCESSING',
      config.placedMinutes,
      `Order older than ${config.placedMinutes} minutes`,
      dryRun
    );

    const processing = await processTransition(
      'PROCESSING',
      'READY_TO_SHIP',
      config.processingMinutes,
      `Order in PROCESSING for more than ${config.processingMinutes} minutes`,
      dryRun
    );

    const updates = [...placed.updates, ...processing.updates];
    const errors = [...placed.errors, ...processing.errors];
    const ordersScanned = placed.scanned + processing.scanned;
    const ordersUpdated = updates.length;
    const completedAt = new Date();

    const logStatus = errors.length === 0 ? 'SUCCESS' : ordersUpdated > 0 ? 'PARTIAL' : 'FAILED';

    if (!dryRun) {
      await SchedulerLog.create({
        runId,
        startedAt,
        completedAt,
        status: logStatus,
        ordersScanned,
        ordersUpdated,
        updates,
        errors,
        triggeredBy,
      });
    }

    return {
      runId,
      startedAt,
      completedAt,
      ordersScanned,
      ordersUpdated,
      updates,
      errors,
      dryRun,
    };
  } finally {
    if (lockHeld) await releaseLock(runId);
  }
}

module.exports = { runScheduler };
