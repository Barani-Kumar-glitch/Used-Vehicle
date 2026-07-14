import logger from '../config/logger.js';
import { env } from '../config/env.js';

/**
 * Global Express error handler.
 * Logs the error and returns a structured JSON response.
 * Stack traces are only exposed in development mode.
 */
export const errorHandler = (err, req, res, next) => {
  // Determine status code
  const status = err.status || err.statusCode || 500;

  // Log at appropriate level
  if (status >= 500) {
    logger.error(`[${req.method}] ${req.url} — ${status}: ${err.message}`, { stack: err.stack });
  } else {
    logger.warn(`[${req.method}] ${req.url} — ${status}: ${err.message}`);
  }

  return res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
