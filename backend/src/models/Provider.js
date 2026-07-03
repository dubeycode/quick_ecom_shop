const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema(
  {
    providerId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Provider', providerSchema);
