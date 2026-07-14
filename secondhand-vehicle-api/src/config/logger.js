import winston from 'winston';
import { env } from '../config/env.js';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack }) => {
    return stack
      ? `${timestamp} [${level}]: ${message}\n${stack}`
      : `${timestamp} [${level}]: ${message}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: env.LOG_LEVEL || (env.NODE_ENV === 'production' ? 'warn' : 'debug'),
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
  ],
});

// In production, also write to files
if (env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
  logger.add(new winston.transports.File({ filename: 'logs/combined.log' }));
}

export default logger;
