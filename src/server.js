const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const cinemaRoutes = require('./routes/cinemas');
const screeningRoutes = require('./routes/screenings');
const ticketRoutes = require('./routes/tickets');
const userRoutes = require('./routes/users');
const reviewRoutes = require('./routes/reviews');
const paymentRoutes = require('./routes/payments');
const paymentRoutesNew = require('./routes/payment.routes');
const revenueRoutes = require('./routes/revenue');
const seatRoutes = require('./routes/seats');
const orderRoutes = require('./routes/orders');
const eventRoutes = require('./routes/events');
const bannerRoutes = require('./routes/banners');
const refundRoutes = require('./routes/refunds');
const promotionRoutes = require('./routes/promotions');
const rbacRoutes = require('./routes/rbac');
const adminUsersRoutes = require('./routes/adminUsers');

app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/cinemas', cinemaRoutes);
app.use('/api/screenings', screeningRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', paymentRoutesNew); // New payment routes
app.use('/api/revenue', revenueRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api', refundRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api', rbacRoutes);
app.use('/api/admin', adminUsersRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

// Start cleanup job for expired seat holds
const { startCleanupJob: startSeatCleanupJob } = require('./jobs/cleanupExpiredHolds');
startSeatCleanupJob(30000); // Run every 30 seconds

// Start cleanup job for expired PENDING tickets
const { startCleanupJob: startTicketCleanupJob } = require('./jobs/cleanupExpiredTickets');
startTicketCleanupJob(30000); // Run every 30 seconds

// Start cleanup job for expired PENDING payments
const { startCleanupJob: startPaymentCleanupJob } = require('./jobs/cleanupExpiredPayments');
startPaymentCleanupJob(30000); // Run every 30 seconds

// Start payment expiry job (DEMO ONLY - requires node-cron)
// Note: Payment expiry is also handled by cleanupExpiredPayments, but this provides additional checking
try {
  const { startPaymentExpiryJob } = require('./jobs/paymentExpiry');
  startPaymentExpiryJob();
} catch (err) {
  // node-cron may not be installed, that's okay - cleanupExpiredPayments handles it
  console.log('[Server] Payment expiry job skipped (node-cron optional)');
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
