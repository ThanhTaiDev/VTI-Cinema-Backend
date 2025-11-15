// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || process.env.VITE_API_URL?.replace('/api', '') || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());

// Routes
const authRoutes = require('../src/routes/auth');
const movieRoutes = require('../src/routes/movies');
const cinemaRoutes = require('../src/routes/cinemas');
const screeningRoutes = require('../src/routes/screenings');
const ticketRoutes = require('../src/routes/tickets');
const userRoutes = require('../src/routes/users');
const reviewRoutes = require('../src/routes/reviews');
const paymentRoutes = require('../src/routes/payments');
const paymentRoutesNew = require('../src/routes/payment.routes');
const revenueRoutes = require('../src/routes/revenue');
const seatRoutes = require('../src/routes/seats');
const orderRoutes = require('../src/routes/orders');
const eventRoutes = require('../src/routes/events');
const bannerRoutes = require('../src/routes/banners');
const refundRoutes = require('../src/routes/refunds');
const promotionRoutes = require('../src/routes/promotions');
const rbacRoutes = require('../src/routes/rbac');
const adminUsersRoutes = require('../src/routes/adminUsers');
const dashboardRoutes = require('../src/routes/dashboard');
const roomRoutes = require('../src/routes/rooms');
const rewardRoutes = require('../src/routes/rewards');

app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/cinemas', cinemaRoutes);
app.use('/api/screenings', screeningRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', paymentRoutesNew);
app.use('/api/revenue', revenueRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api', refundRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api', rbacRoutes);
app.use('/api/admin', adminUsersRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/rooms', roomRoutes);
app.use('/api', rewardRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

// Note: Background jobs (cleanupExpiredHolds, cleanupExpiredTickets, etc.)
// are disabled on Vercel serverless. Consider using Vercel Cron Jobs
// or external cron service for these tasks.

module.exports = app;

