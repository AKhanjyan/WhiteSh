// server.js — CLEAN & RENDER-READY VERSION

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./lib/mongodb');

const app = express();
const PORT = process.env.PORT || 3001;


// -----------------------
// Security Middleware
// -----------------------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  })
);


// -----------------------
// CORS CONFIG
// -----------------------
const corsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    // Allow internal calls without Origin (Render health checks)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.APP_URL,
      'https://white-shop-1.onrender.com'
    ];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn('❌ CORS blocked:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
};

app.use(cors(corsOptions));


// -----------------------
// Body Parsers
// -----------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


// -----------------------
// Rate Limiting
// -----------------------
app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 200 : 2000,
    standardHeaders: true,
    legacyHeaders: false,
  })
);


// -----------------------
// Health Check
// -----------------------
app.get('/health', async (req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState;

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db: dbState === 1 ? 'connected' : 'disconnected',
  });
});


// -----------------------
// BASE ROUTE
// -----------------------
app.get('/', (req, res) => {
  res.send('API is running!');
});


// -----------------------
// ROUTES
// -----------------------
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/products', require('./routes/products'));
app.use('/api/v1/categories', require('./routes/categories'));
app.use('/api/v1/cart', require('./routes/cart'));
app.use('/api/v1/orders', require('./routes/orders'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/admin', require('./routes/admin'));


// -----------------------
// ERROR HANDLER
// -----------------------
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.message);
  res.status(500).json({
    status: 500,
    message: err.message,
  });
});


// -----------------------
// START SERVER
// -----------------------
const startServer = async () => {
  try {
    // Connect to MongoDB (required in production)
    const db = await connectDB();
    if (!db && process.env.NODE_ENV === 'production') {
      console.error('❌ MongoDB is required in production.');
      process.exit(1);
    }

    app.listen(PORT, () =>
      console.log(`🚀 API running on port ${PORT} (Render-provided)`)
    );

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
