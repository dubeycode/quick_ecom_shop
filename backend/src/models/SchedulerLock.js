const mongoose = require('mongoose');

const schedulerLockSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'order_scheduler' },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: String, default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: false }
);

schedulerLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('SchedulerLock', schedulerLockSchema);
