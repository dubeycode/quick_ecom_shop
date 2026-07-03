const mongoose = require('mongoose');
const { ORDER_STATUSES, PAYMENT_STATUSES } = require('../constants');

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    productName: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, required: true },
    orderStatus: { type: String, enum: ORDER_STATUSES, default: 'PLACED' },

    providerId: { type: String, default: null },
    providerName: { type: String, default: null },
    assignedAt: { type: Date, default: null },

    otpHash: { type: String, default: null },
    otpPlain: { type: String, default: null, select: false },
    otpExpiresAt: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    otpSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ phone: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, updatedAt: 1 });

module.exports = mongoose.model('Order', orderSchema);
