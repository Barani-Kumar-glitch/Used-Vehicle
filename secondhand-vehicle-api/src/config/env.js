import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

// Force DNS resolution to prefer IPv4 first. This prevents IPv6 connection errors
// like ENETUNREACH when connecting to external APIs (e.g. Gmail SMTP) on IPv4-only cloud hosts.
if (dns && dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

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
  MOCK_SMS: process.env.MOCK_SMS ? process.env.MOCK_SMS === 'true' : process.env.NODE_ENV !== 'production',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'SecondHand Vehicles',
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || 'noreply@secondhandvehicles.com',
  MOCK_EMAIL: process.env.MOCK_EMAIL ? process.env.MOCK_EMAIL === 'true' : process.env.NODE_ENV !== 'production',
  REFERRAL_COMMISSION_PERCENT: parseFloat(process.env.REFERRAL_COMMISSION_PERCENT || '5.0'), // Default 5%
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
};
