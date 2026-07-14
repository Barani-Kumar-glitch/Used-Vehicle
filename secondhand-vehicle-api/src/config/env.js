import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // Fallback to local .env

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/secondhand_vehicle',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_customer_jwt_key',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'super_secret_customer_refresh_jwt_key',
  ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET || 'super_secret_admin_jwt_key',
  ADMIN_JWT_REFRESH_SECRET: process.env.ADMIN_JWT_REFRESH_SECRET || 'super_secret_admin_refresh_jwt_key',
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
  MOCK_SMS: process.env.MOCK_SMS !== 'false', // Default true for development
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'SecondHand Vehicles',
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || 'noreply@secondhandvehicles.com',
  MOCK_EMAIL: process.env.MOCK_EMAIL !== 'false', // Default true for development
  REFERRAL_COMMISSION_PERCENT: parseFloat(process.env.REFERRAL_COMMISSION_PERCENT || '5.0'), // Default 5%
  REFERRAL_LINK_EXPIRY_DAYS: parseInt(process.env.REFERRAL_LINK_EXPIRY_DAYS || '90', 10), // Default 90 days
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
};
