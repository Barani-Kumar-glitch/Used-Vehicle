import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import vehicleRoutes from './routes/vehicles.routes.js';
import driverRoutes from './routes/drivers.routes.js';
import orderRoutes from './routes/orders.routes.js';
import requestRoutes from './routes/requests.routes.js';
import referralRoutes from './routes/referrals.routes.js';
import adminRoutes from './routes/admin.routes.js';

import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter, authLimiter, adminLimiter } from './middleware/rateLimiter.js';
import logger from './config/logger.js';
import { env } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ─── Security: HTTP Headers ─────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow React to fetch static images
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
}));

// ─── CORS ────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',  // Vite dev server
  'http://localhost:3000',  // Alternative dev port
  ...(env.CLIENT_ORIGIN ? env.CLIENT_ORIGIN.split(',').map(o => o.trim()) : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin) || env.CLIENT_ORIGIN === '*') {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
}));

// ─── Trust Proxy (for rate limiting behind Nginx/Load Balancer) ──────
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ─── Request Logging ─────────────────────────────────────────────────
const morganFormat = env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: { write: (message) => logger.http(message.trim()) },
  skip: (req) => req.url === '/health', // Skip health-check noise
}));

// ─── Body Parsing ─────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static Files ─────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// ─── Health Check (no rate limit) ─────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: env.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes with Rate Limiting ───────────────────────────────────
// Auth: strict limiter on OTP and login endpoints
app.use('/api/auth/send-otp', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/admin/login', authLimiter);

// Admin: dedicated limiter
app.use('/api/admin', adminLimiter);

// General: all remaining API routes
app.use('/api', generalLimiter);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/admin', adminRoutes);

// ─── Root ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Secondhand Vehicle API. Status: Running.', version: '1.0.0' });
});

// ─── 404 Handler ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found.` });
});

// ─── Global Error Handler ─────────────────────────────────────────────
app.use(errorHandler);

export default app;
