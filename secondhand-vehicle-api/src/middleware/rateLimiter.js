import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter — applies to all /api/* routes.
 * 100 requests per IP every 15 minutes.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 250,
  standardHeaders: true,  // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,   // Disable X-RateLimit-* headers
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

/**
 * Strict limiter for OTP/auth endpoints to prevent brute-force.
 * 30 requests per IP every 15 minutes.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
  },
});

/**
 * Admin-specific limiter — 50 requests per IP every 15 minutes.
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 250,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many admin requests from this IP, please try again after 15 minutes.',
  },
});
