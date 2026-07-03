const mongoose = require('mongoose');
const dns = require('dns');

// Windows/ISP DNS often fails mongodb+srv SRV lookup (querySrv ETIMEOUT).
// Force public DNS so Node can resolve Atlas hosts.
dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set in environment variables');
  }

  const host = uri.replace(/^mongodb(\+srv)?:\/\/([^@]+@)?/, '').split('/')[0];
  console.log('Connecting to MongoDB host:', host);

  await mongoose.connect(uri, { family: 4 });
  console.log('MongoDB connected');
}

module.exports = connectDB;
