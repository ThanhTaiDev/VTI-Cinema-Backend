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
const revenueRoutes = require('./routes/revenue');

app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/cinemas', cinemaRoutes);
app.use('/api/screenings', screeningRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/revenue', revenueRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
