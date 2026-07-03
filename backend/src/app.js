const express = require('express');
const cors = require('cors');
const userOrdersRouter = require('./routes/user/orders');
const adminRouter = require('./routes/admin');
const schedulerRouter = require('./routes/scheduler');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'OrderFlow API is running' });
});

app.use('/api/v1/user/orders', userOrdersRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/scheduler', schedulerRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
