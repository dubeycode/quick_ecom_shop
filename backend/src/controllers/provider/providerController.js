const bcrypt = require('bcryptjs');
const Order = require('../../models/Order');
const StatusHistory = require('../../models/StatusHistory');
const Provider = require('../../models/Provider');
const { signProviderToken } = require('../../utils/providerToken');
const { generateOtp, getOtpExpiryDate, hashOtp, verifyOtp } = require('../../utils/otpUtils');

const MAX_OTP_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 3;

function formatProviderOrder(order) {
  return {
    orderId: order.orderId,
    customerName: order.customerName,
    phone: order.phone,
    productName: order.productName,
    amount: order.amount,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    assignedAt: order.assignedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

async function login(req, res, next) {
  try {
    const { phone, password } = req.body || {};
    const errors = [];

    if (!phone || !/^\d{10}$/.test(String(phone))) {
      errors.push({ field: 'phone', message: 'Phone must be 10 digits' });
    }
    if (!password) {
      errors.push({ field: 'password', message: 'Password is required' });
    }

    if (errors.length) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const provider = await Provider.findOne({ phone: String(phone), isActive: true });
    if (!provider) {
      return res.status(401).json({ success: false, message: 'Invalid phone or password' });
    }

    const valid = await bcrypt.compare(String(password), provider.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid phone or password' });
    }

    const token = signProviderToken(provider);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        provider: {
          providerId: provider.providerId,
          name: provider.name,
          phone: provider.phone,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function listMyOrders(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { providerId: req.provider.providerId };

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ assignedAt: -1, createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        orders: orders.map(formatProviderOrder),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function sendOtp(req, res, next) {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.providerId !== req.provider.providerId) {
      return res.status(403).json({ success: false, message: 'This order is not assigned to you' });
    }

    if (order.orderStatus !== 'READY_TO_SHIP') {
      return res.status(400).json({
        success: false,
        message: 'OTP can only be generated when order is READY_TO_SHIP',
      });
    }

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const otpExpiresAt = getOtpExpiryDate();
    const fromStatus = order.orderStatus;

    order.otpHash = otpHash;
    order.otpPlain = otp;
    order.otpExpiresAt = otpExpiresAt;
    order.otpAttempts = 0;
    order.otpSentAt = new Date();
    order.orderStatus = 'OUT_FOR_DELIVERY';
    await order.save();

    await StatusHistory.create({
      orderId: order.orderId,
      fromStatus,
      toStatus: 'OUT_FOR_DELIVERY',
      changedBy: 'PROVIDER',
      changedById: req.provider.providerId,
      note: 'Delivery OTP generated',
    });

    // OTP is never returned to provider — only visible on customer order panel
    res.json({
      success: true,
      message: 'OTP sent to customer order panel. Ask customer for the code at delivery.',
      data: {
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        otpExpiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function verifyOtpHandler(req, res, next) {
  try {
    const { orderId } = req.params;
    const { otp } = req.body || {};

    if (!otp || !/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'otp', message: 'OTP must be 6 digits' }],
      });
    }

    const order = await Order.findOne({ orderId }).select('+otpPlain +otpHash');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.providerId !== req.provider.providerId) {
      return res.status(403).json({ success: false, message: 'This order is not assigned to you' });
    }

    if (order.orderStatus !== 'OUT_FOR_DELIVERY') {
      return res.status(400).json({ success: false, message: 'Order is not out for delivery' });
    }

    if (!order.otpHash || !order.otpExpiresAt) {
      return res.status(400).json({ success: false, message: 'No active OTP. Generate OTP first.' });
    }

    if (new Date(order.otpExpiresAt) < new Date()) {
      return res.status(410).json({ success: false, message: 'OTP expired. Please generate a new OTP.' });
    }

    if (order.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Generate a new OTP.' });
    }

    const valid = await verifyOtp(String(otp), order.otpHash);
    if (!valid) {
      order.otpAttempts += 1;
      await order.save();
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
        data: { attemptsRemaining: Math.max(0, MAX_OTP_ATTEMPTS - order.otpAttempts) },
      });
    }

    const fromStatus = order.orderStatus;
    order.orderStatus = 'COMPLETED';
    order.otpHash = null;
    order.otpPlain = null;
    order.otpExpiresAt = null;
    order.otpAttempts = 0;
    order.otpSentAt = null;
    await order.save();

    await StatusHistory.create({
      orderId: order.orderId,
      fromStatus,
      toStatus: 'COMPLETED',
      changedBy: 'PROVIDER',
      changedById: req.provider.providerId,
      note: 'OTP verified — delivery completed',
    });

    res.json({
      success: true,
      message: 'OTP verified. Order marked as COMPLETED.',
      data: {
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        completedAt: order.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, listMyOrders, sendOtp, verifyOtpHandler };
