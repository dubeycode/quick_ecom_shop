const Order = require('../../models/Order');
const StatusHistory = require('../../models/StatusHistory');
const SchedulerLog = require('../../models/SchedulerLog');
const { ORDER_STATUSES, PAYMENT_STATUSES } = require('../../constants');
const { formatAdminListItem, formatAdminDetail } = require('../../utils/formatOrder');

const SORT_FIELDS = ['createdAt', 'updatedAt', 'amount'];

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

function buildOrderFilter(query) {
  const filter = {};

  if (query.status && ORDER_STATUSES.includes(query.status)) {
    filter.orderStatus = query.status;
  }

  if (query.paymentStatus && PAYMENT_STATUSES.includes(query.paymentStatus)) {
    filter.paymentStatus = query.paymentStatus;
  }

  if (query.search) {
    const term = String(query.search).trim();
    filter.$or = [
      { orderId: { $regex: term, $options: 'i' } },
      { customerName: { $regex: term, $options: 'i' } },
    ];
  }

  return filter;
}

function buildSort(query) {
  const sortBy = SORT_FIELDS.includes(query.sortBy) ? query.sortBy : 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  return { [sortBy]: sortOrder };
}

async function listOrders(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = buildOrderFilter(req.query);
    const sort = buildSort(req.query);

    const [orders, total] = await Promise.all([
      Order.find(filter).sort(sort).skip(skip).limit(limit),
      Order.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        orders: orders.map(formatAdminListItem),
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
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const statusHistory = await StatusHistory.find({ orderId }).sort({ createdAt: 1 });

    res.json({
      success: true,
      data: formatAdminDetail(order, statusHistory),
    });
  } catch (err) {
    next(err);
  }
}

async function getStats(req, res, next) {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totals, statusAgg, paymentAgg, todayOrders] = await Promise.all([
      Order.aggregate([
        { $group: { _id: null, totalOrders: { $sum: 1 }, totalRevenue: { $sum: '$amount' } } },
      ]),
      Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
      Order.aggregate([{ $group: { _id: '$paymentStatus', count: { $sum: 1 } } }]),
      Order.countDocuments({ createdAt: { $gte: startOfToday } }),
    ]);

    const byOrderStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
    statusAgg.forEach(({ _id, count }) => {
      if (_id) byOrderStatus[_id] = count;
    });

    const byPaymentStatus = Object.fromEntries(PAYMENT_STATUSES.map((s) => [s, 0]));
    paymentAgg.forEach(({ _id, count }) => {
      if (_id) byPaymentStatus[_id] = count;
    });

    const summary = totals[0] || { totalOrders: 0, totalRevenue: 0 };

    res.json({
      success: true,
      data: {
        totalOrders: summary.totalOrders,
        totalRevenue: summary.totalRevenue,
        byOrderStatus,
        byPaymentStatus,
        todayOrders,
        lastUpdatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getSchedulerLogs(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const [logs, total] = await Promise.all([
      SchedulerLog.find().sort({ startedAt: -1 }).skip(skip).limit(limit),
      SchedulerLog.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        logs,
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

async function getOrderHistory(req, res, next) {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId }).select('orderId');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const history = await StatusHistory.find({ orderId }).sort({ createdAt: 1 });

    res.json({
      success: true,
      data: {
        orderId,
        history: history.map((entry) => ({
          fromStatus: entry.fromStatus,
          toStatus: entry.toStatus,
          changedAt: entry.createdAt,
          changedBy: entry.changedBy,
          changedById: entry.changedById,
          note: entry.note,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const { orderId } = req.params;
    const nextStatus = req.body?.orderStatus || req.body?.status;
    const { note } = req.body || {};

    if (!nextStatus || !ORDER_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'orderStatus', message: 'Invalid or missing order status' }],
      });
    }

    const existing = await Order.findOne({ orderId });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (existing.orderStatus === nextStatus) {
      return res.json({
        success: true,
        message: 'Order status unchanged',
        data: formatAdminListItem(existing),
      });
    }

    const fromStatus = existing.orderStatus;

    const order = await Order.findOneAndUpdate(
      { orderId },
      { $set: { orderStatus: nextStatus } },
      { new: true, runValidators: true }
    );

    await StatusHistory.create({
      orderId: order.orderId,
      fromStatus,
      toStatus: nextStatus,
      changedBy: 'ADMIN',
      note: note || 'Status updated by admin',
    });

    res.json({
      success: true,
      message: 'Order status updated',
      data: formatAdminListItem(order),
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

module.exports = {
  listOrders,
  getOrderDetail,
  getStats,
  getSchedulerLogs,
  getOrderHistory,
  updateOrderStatus,
};
