const bcrypt = require('bcryptjs');
const crypto = require('crypto');

function generateOtp(length = 6) {
  const len = parseInt(process.env.OTP_LENGTH, 10) || length;
  const max = 10 ** len;
  return String(crypto.randomInt(0, max)).padStart(len, '0');
}

function getOtpExpiryDate() {
  const minutes = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 30;
  return new Date(Date.now() + minutes * 60 * 1000);
}

async function hashOtp(otp) {
  return bcrypt.hash(otp, 10);
}

async function verifyOtp(otp, hash) {
  return bcrypt.compare(otp, hash);
}

module.exports = { generateOtp, getOtpExpiryDate, hashOtp, verifyOtp };
