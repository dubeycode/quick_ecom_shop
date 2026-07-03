const bcrypt = require('bcryptjs');
const Provider = require('../../models/Provider');
const Order = require('../../models/Order');
const StatusHistory = require('../../models/StatusHistory');
const generateProviderId = require('../../utils/generateProviderId');

async function createProvider(req, res, next) {
  try {
    const name = String(req.body?.name || '').trim();
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    const password = String(req.body?.password || '');
    const errors = [];

    if (name.length < 2) {
      errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
    }
    if (!/^\d{10}$/.test(phone)) {
      errors.push({ field: 'phone', message: 'Phone must be exactly 10 digits' });
    }
    if (password.length < 4) {
      errors.push({ field: 'password', message: 'Password must be at least 4 characters' });
    }

    if (errors.length) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const existing = await Provider.findOne({ phone });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Provider with this phone already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const provider = await Provider.create({
      providerId: generateProviderId(),
      name,
      phone,
      passwordHash,
    });

    res.status(201).json({
      success: true,
      message: 'Provider created successfully',
      data: {
        providerId: provider.providerId,
        name: provider.name,
        phone: provider.phone,
        isActive: provider.isActive,
        createdAt: provider.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function listProviders(req, res, next) {
  try {
    const providers = await Provider.find().sort({ createdAt: -1 }).select('-passwordHash');
    res.json({ success: true, data: { providers } });
  } catch (err) {
    next(err);
  }
}

async function assignOrder(req, res, next) {
  try {
    const { orderId } = req.params;
    const providerId = String(req.body?.providerId || '').trim();

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'providerId', message: 'Provider is required' }],
      });
    }

    const provider = await Provider.findOne({ providerId, isActive: true });
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.orderStatus !== 'READY_TO_SHIP') {
      return res.status(400).json({
        success: false,
        message: `Order must be READY_TO_SHIP before assigning a provider (current: ${order.orderStatus})`,
      });
    }

    if (order.providerId && order.providerId !== providerId) {
      return res.status(409).json({
        success: false,
        message: 'Order already assigned to another provider',
      });
    }

    if (order.providerId === providerId) {
      return res.json({
        success: true,
        message: 'Order already assigned to this provider',
        data: {
          orderId: order.orderId,
          orderStatus: order.orderStatus,
          providerId: order.providerId,
          providerName: order.providerName,
        },
      });
    }

    const assignedAt = new Date();
    const updated = await Order.findOneAndUpdate(
      { orderId, orderStatus: 'READY_TO_SHIP', $or: [{ providerId: null }, { providerId: '' }] },
      {
        $set: {
          providerId: provider.providerId,
          providerName: provider.name,
          assignedAt,
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(409).json({
        success: false,
        message: 'Order could not be assigned. It may already have a provider.',
      });
    }

    await StatusHistory.create({
      orderId: updated.orderId,
      fromStatus: 'READY_TO_SHIP',
      toStatus: 'READY_TO_SHIP',
      changedBy: 'ADMIN',
      changedById: provider.providerId,
      note: `Assigned to ${provider.name}`,
    });

    res.json({
      success: true,
      message: 'Order assigned to provider',
      data: {
        orderId: updated.orderId,
        orderStatus: updated.orderStatus,
        providerId: updated.providerId,
        providerName: updated.providerName,
        assignedAt: updated.assignedAt,
      },
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(err.errors).map((e) => ({
          field: e.path,
          message: e.message,
        })),
      });
    }
    next(err);
  }
}

module.exports = { createProvider, listProviders, assignOrder };
