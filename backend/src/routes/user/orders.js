const express = require('express');
const { createOrder, listOrders, getOrderDetail } = require('../../controllers/user/orderController');

const router = express.Router();

router.post('/', createOrder);
router.get('/', listOrders);
router.get('/:orderId', getOrderDetail);

module.exports = router;
