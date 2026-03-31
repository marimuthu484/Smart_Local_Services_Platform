const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const path = require('path');

/* Route imports */
const authRoutes = require('./routes/auth.routes');
const serviceRoutes = require('./routes/service.routes');
const bookingRoutes = require('./routes/booking.routes');
const reviewRoutes = require('./routes/review.routes');
const adminRoutes = require('./routes/admin.routes');
const chatRoutes = require('./routes/chat.routes');
const notificationRoutes = require('./routes/notification.routes');
const paymentRoutes = require('./routes/payment.routes');

/* Middleware imports */
const { errorHandler, notFound } = require('./middleware/error.middleware');

const app = express();

/* --------------- Global Middleware --------------- */

// Security headers
app.use(helmet());

// CORS
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (provider documents) — admin can preview/download
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Sanitize mongo queries (prevent NoSQL injection)
app.use(mongoSanitize());

// Request logging in development
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Global rate limiter — 100 requests per 15 min per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', globalLimiter);

/* --------------- Routes --------------- */

app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'Smart Local Services API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);

/* --------------- Error Handling --------------- */

app.use(notFound);
app.use(errorHandler);

module.exports = app;
