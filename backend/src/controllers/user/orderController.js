const Order = require('../../models/Order');
const StatusHistory = require('../../models/StatusHistory');
const generateOrderId = require('../../utils/generateOrderId');
const { formatOrderListItem, formatOrderDetail } = require('../../utils/formatOrder');
const { validateCreateOrder, validatePhoneQuery } = require('../../middleware/validateUserOrder');

async function createOrder(req, res, next) {
  try {
    const errors = validateCreateOrder(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const { customerName, phone, productName, amount, paymentStatus } = req.body;

    const order = await Order.create({
      orderId: generateOrderId(),
      customerName: String(customerName).trim(),
      phone: String(phone),
      productName: String(productName).trim(),
      amount: Number(amount),
      paymentStatus,
      orderStatus: 'PLACED',
    });

    await StatusHistory.create({
      orderId: order.orderId,
      fromStatus: null,
      toStatus: 'PLACED',
      changedBy: 'SYSTEM',
      note: 'Order placed by customer',
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order.orderId,
        customerName: order.customerName,
        phone: order.phone,
        productName: order.productName,
        amount: order.amount,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function listOrders(req, res, next) {
  try {
    const errors = validatePhoneQuery(req.query.phone);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const phone = String(req.query.phone);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = { phone };
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .select('+otpPlain')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        orders: orders.map(formatOrderListItem),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getOrderDetail(req, res, next) {
  try {
    const errors = validatePhoneQuery(req.query.phone);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const { orderId } = req.params;
    const phone = String(req.query.phone);

    const order = await Order.findOne({ orderId }).select('+otpPlain');
    if (!order || order.phone !== phone) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const statusHistory = await StatusHistory.find({ orderId }).sort({ createdAt: 1 });

    res.json({
      success: true,
      data: formatOrderDetail(order, statusHistory),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, listOrders, getOrderDetail };
