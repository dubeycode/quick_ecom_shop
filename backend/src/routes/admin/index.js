const express = require('express');
const adminAuth = require('../../middleware/adminAuth');
const {
  listOrders,
  getOrderDetail,
  getStats,
  getSchedulerLogs,
  getOrderHistory,
  updateOrderStatus,
  triggerScheduler,
} = require('../../controllers/admin/adminController');

const router = express.Router();

router.use(adminAuth);

router.get('/orders', listOrders);
router.get('/stats', getStats);
router.get('/scheduler-logs', getSchedulerLogs);
router.post('/scheduler/run', triggerScheduler);
router.get('/orders/:orderId/history', getOrderHistory);
router.get('/orders/:orderId', getOrderDetail);
router.patch('/orders/:orderId/status', updateOrderStatus);

module.exports = router;
