const { PAYMENT_STATUSES } = require('../constants');

function validateCreateOrder(body) {
  const errors = [];

  if (!body.customerName || String(body.customerName).trim().length < 2) {
    errors.push({ field: 'customerName', message: 'Customer name must be at least 2 characters' });
  }

  if (!body.phone || !/^\d{10}$/.test(String(body.phone))) {
    errors.push({ field: 'phone', message: 'Phone must be 10 digits' });
  }

  if (!body.productName || !String(body.productName).trim()) {
    errors.push({ field: 'productName', message: 'Product name is required' });
  }

  if (body.amount === undefined || body.amount === null || Number(body.amount) <= 0) {
    errors.push({ field: 'amount', message: 'Amount must be a positive number' });
  }

  if (!body.paymentStatus || !PAYMENT_STATUSES.includes(body.paymentStatus)) {
    errors.push({
      field: 'paymentStatus',
      message: `Payment status must be one of: ${PAYMENT_STATUSES.join(', ')}`,
    });
  }

  return errors;
}

function validatePhoneQuery(phone) {
  if (!phone) {
    return [{ field: 'phone', message: 'Phone is required' }];
  }
  if (!/^\d{10}$/.test(String(phone))) {
    return [{ field: 'phone', message: 'Phone must be 10 digits' }];
  }
  return [];
}

module.exports = { validateCreateOrder, validatePhoneQuery };
