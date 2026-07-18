import nodemailer from 'nodemailer';
import dns from 'dns';
import { env } from '../config/env.js';
import logger from '../config/logger.js';

let transporter = null;
let transporterPromise = null;

const cleanVal = (val) => {
  if (!val) return '';
  const trimmed = val.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const initTransporter = async () => {
  if (env.MOCK_EMAIL) {
    logger.info('[EmailService] Running in MOCK_EMAIL mode — no real emails will be sent.');
    return null;
  }

  if (env.BREVO_API_KEY) {
    logger.info('[EmailService] Brevo API Key configured — using Brevo HTTP API.');
    return null;
  }

  const originalHost = cleanVal(env.SMTP_HOST);
  let host = originalHost;
  let tlsOptions = {};

  try {
    const address = await new Promise((resolve, reject) => {
      dns.lookup(originalHost, { family: 4 }, (err, addr) => {
        if (err) reject(err);
        else resolve(addr);
      });
    });
    host = address;
    tlsOptions = {
      servername: originalHost,
    };
    logger.info(`[EmailService] DNS lookup resolved ${originalHost} to IPv4: ${host}`);
  } catch (dnsErr) {
    logger.warn(`[EmailService] DNS lookup failed for ${originalHost}, using fallback: ${dnsErr.message}`);
  }

  const user = cleanVal(env.SMTP_USER);
  const pass = cleanVal(env.SMTP_PASS).replace(/\s+/g, '');

  const t = nodemailer.createTransport({
    host,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465, // true for 465, false for 587
    auth: {
      user,
      pass,
    },
    tls: tlsOptions,
    connectionTimeout: 10000, // 10 seconds timeout
    family: 4 // Forces Nodemailer to connect using IPv4 instead of IPv6
  });

  logger.info(`[EmailService] SMTP transporter initialized (${originalHost} via ${host}:${env.SMTP_PORT})`);
  return t;
};

// Start transporter initialization asynchronously
transporterPromise = initTransporter().then((t) => {
  transporter = t;
  return t;
}).catch((err) => {
  logger.error(`[EmailService] Transporter initialization failed: ${err.message}`);
  return null;
});

/**
 * Send a raw email.
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (env.MOCK_EMAIL) {
    logger.debug(`[MOCK EMAIL] TO: ${to} | SUBJECT: ${subject} | BODY: ${text || html}`);
    return { success: true, mock: true };
  }

  // 1. If BREVO_API_KEY is configured, send via Brevo HTTP API (ideal for Render Free tier)
  if (env.BREVO_API_KEY) {
    try {
      const apiKey = cleanVal(env.BREVO_API_KEY);
      const fromName = cleanVal(env.SMTP_FROM_NAME) || 'SecondHand Vehicles';
      const fromEmail = cleanVal(env.SMTP_FROM_EMAIL) || 'noreply@secondhandvehicles.com';

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'content-type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Brevo HTTP API ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      logger.info(`[EmailService] Email sent via Brevo HTTP to ${to} | MessageId: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error(`[EmailService] Failed to send email via Brevo HTTP to ${to}: ${error.message}`);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  // 2. Otherwise, fall back to Nodemailer SMTP (ideal for local testing)
  if (!transporter) {
    transporter = await transporterPromise;
  }

  if (!transporter) {
    throw new Error('Email service SMTP transporter is not initialized.');
  }

  try {
    const fromName = cleanVal(env.SMTP_FROM_NAME);
    const fromEmail = cleanVal(env.SMTP_FROM_EMAIL);
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
      text,
    });
    logger.info(`[EmailService] Email sent to ${to} | MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`[EmailService] Failed to send email to ${to}: ${error.message}`);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send an OTP email with a styled HTML template.
 */
export const sendOTPEmail = async (email, otpCode, purpose = 'login') => {
  const purposeLabel = purpose === 'signup' ? 'Account Verification' : 'Login Verification';
  const subject = `Your SecondHand Vehicles OTP — ${otpCode}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:32px 40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                    🚗 SecondHand Vehicles
                  </h1>
                  <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">${purposeLabel}</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                    Your one-time verification code is:
                  </p>
                  <!-- OTP Box -->
                  <div style="text-align:center;margin:24px 0;">
                    <span style="display:inline-block;background:#f0f5ff;border:2px dashed #2563eb;border-radius:12px;padding:18px 40px;font-size:42px;font-weight:800;letter-spacing:12px;color:#1e3a5f;">
                      ${otpCode}
                    </span>
                  </div>
                  <p style="margin:16px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">
                    This code is valid for <strong>5 minutes</strong>. Do not share it with anyone.
                  </p>
                  <hr style="margin:28px 0;border:none;border-top:1px solid #e5e7eb;" />
                  <p style="margin:0;color:#9ca3af;font-size:12px;">
                    If you didn't request this code, please ignore this email or contact support.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f3f4f6;">
                  <p style="margin:0;color:#9ca3af;font-size:11px;">
                    © ${new Date().getFullYear()} SecondHand Vehicles Platform. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
    text: `Your SecondHand Vehicles OTP is: ${otpCode}\nThis code is valid for 5 minutes. Do not share it with anyone.`,
  });
};
