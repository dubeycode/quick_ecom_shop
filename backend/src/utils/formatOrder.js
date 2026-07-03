function isActiveOtp(order) {
  return (
    order.orderStatus === 'OUT_FOR_DELIVERY' &&
    order.otpPlain &&
    order.otpExpiresAt &&
    new Date(order.otpExpiresAt) > new Date()
  );
}

function formatOrderListItem(order) {
  const item = {
    orderId: order.orderId,
    customerName: order.customerName,
    phone: order.phone,
    productName: order.productName,
    amount: order.amount,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };

  if (isActiveOtp(order)) {
    item.otp = order.otpPlain;
    item.otpExpiresAt = order.otpExpiresAt;
  }

  return item;
}

function formatOrderDetail(order, statusHistory) {
  const detail = {
    orderId: order.orderId,
    customerName: order.customerName,
    phone: order.phone,
    productName: order.productName,
    amount: order.amount,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    statusHistory: statusHistory.map((entry) => ({
      status: entry.toStatus,
      changedAt: entry.createdAt,
      changedBy: entry.changedBy,
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };

  if (isActiveOtp(order)) {
    detail.otp = order.otpPlain;
    detail.otpExpiresAt = order.otpExpiresAt;
  }

  return detail;
}

module.exports = { formatOrderListItem, formatOrderDetail, isActiveOtp };
