import twilio from 'twilio';
import { env } from '../config/env.js';
import logger from '../config/logger.js';

let twilioClient = null;

if (!env.MOCK_SMS && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    logger.info('Twilio client initialized successfully.');
  } catch (error) {
    logger.error(`Failed to initialize Twilio client: ${error.message}`);
  }
} else {
  logger.info('Twilio running in MOCK_SMS mode - no real SMS will be sent.');
}

export const sendSMS = async (phone, body) => {
  if (env.MOCK_SMS || !twilioClient) {
    logger.debug(`[MOCK SMS] TO: ${phone} | BODY: ${body}`);
    return { success: true, mock: true };
  }

  try {
    const message = await twilioClient.messages.create({
      body,
      from: env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`SMS sent successfully. SID: ${message.sid} | TO: ${phone}`);
    return { success: true, sid: message.sid };
  } catch (error) {
    logger.error(`Twilio send error to ${phone}: ${error.message}`);
    throw new Error(`Failed to send SMS via Twilio: ${error.message}`);
  }
};

export const sendOTP = async (phone, otpCode) => {
  const body = `Your Secondhand Vehicle OTP is ${otpCode}. It is valid for 5 minutes.`;
  return sendSMS(phone, body);
};
