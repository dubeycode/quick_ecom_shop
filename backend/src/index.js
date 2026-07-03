const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const connectDB = require('./config/db');
const startLocalScheduler = require('./jobs/startLocalScheduler');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  startLocalScheduler();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message || err);
  process.exit(1);
});
