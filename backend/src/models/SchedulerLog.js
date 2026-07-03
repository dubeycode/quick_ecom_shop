const mongoose = require('mongoose');

const schedulerLogSchema = new mongoose.Schema(
  {
    runId: { type: String, required: true, unique: true },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    status: { type: String, enum: ['SUCCESS', 'PARTIAL', 'FAILED'], required: true },
    ordersScanned: { type: Number, default: 0 },
    ordersUpdated: { type: Number, default: 0 },
    updates: [
      {
        orderId: String,
        fromStatus: String,
        toStatus: String,
        reason: String,
      },
    ],
    errors: [{ orderId: String, message: String }],
    triggeredBy: { type: String, enum: ['CRON', 'MANUAL'], default: 'CRON' },
  },
  { timestamps: false, suppressReservedKeysWarning: true }
);

schedulerLogSchema.index({ startedAt: -1 });

module.exports = mongoose.model('SchedulerLog', schedulerLogSchema);
