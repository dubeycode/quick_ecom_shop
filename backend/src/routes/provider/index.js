const express = require('express');
const providerAuth = require('../../middleware/providerAuth');
const {
  login,
  listMyOrders,
  sendOtp,
  verifyOtpHandler,
} = require('../../controllers/provider/providerController');

const router = express.Router();

router.post('/login', login);
router.get('/orders/my', providerAuth, listMyOrders);
router.post('/orders/:orderId/send-otp', providerAuth, sendOtp);
router.post('/orders/:orderId/verify-otp', providerAuth, verifyOtpHandler);

module.exports = router;
