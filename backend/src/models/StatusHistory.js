const mongoose = require('mongoose');
const { ORDER_STATUSES, CHANGED_BY } = require('../constants');

const statusHistorySchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true },
    fromStatus: { type: String, enum: [...ORDER_STATUSES, null], default: null },
    toStatus: { type: String, enum: ORDER_STATUSES, required: true },
    changedBy: { type: String, enum: CHANGED_BY, required: true },
    changedById: { type: String, default: null },
    note: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

statusHistorySchema.index({ orderId: 1, createdAt: -1 });

module.exports = mongoose.model('StatusHistory', statusHistorySchema);
