import crypto from 'crypto';
import bcrypt from 'bcrypt';
import fs from 'fs';
import { Customer, CustomerOTPVerification, Referral, AdminUser, StatusEventLog, Vehicle } from '../models/index.js';
import { Op } from 'sequelize';
import { sendOTPEmail } from '../services/emailService.js';
import {
  generateCustomerAccessToken,
  generateCustomerRefreshToken,
  generateAdminAccessToken,
  generateAdminRefreshToken
} from '../middleware/authJwt.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Check if the email is blocked due to 3 failed OTP attempts in the last 15 minutes
const checkOTPBlock = async (email) => {
  const blockRecord = await CustomerOTPVerification.findOne({
    where: {
      email,
      attempt_count: { [Op.gte]: 3 },
      verified_at: null,
      updated_at: {
        [Op.gt]: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
      }
    },
    order: [['updated_at', 'DESC']]
  });

  if (blockRecord) {
    const timePassed = Date.now() - new Date(blockRecord.updated_at).getTime();
    const timeRemaining = Math.ceil((15 * 60 * 1000 - timePassed) / (60 * 1000));
    return timeRemaining > 0 ? timeRemaining : 1;
  }
  return null;
};

// Send OTP helper
const generateAndSendOTP = async (email, purpose, customerId = null) => {
  // Check if blocked
  const timeRemaining = await checkOTPBlock(email);
  if (timeRemaining !== null) {
    const error = new Error(`Too many failed attempts. Please try again after ${timeRemaining} minutes.`);
    error.statusCode = 429;
    throw error;
  }

  // 1. Generate 6-digit OTP
  const rawOtp = crypto.randomInt(100000, 999999).toString();
  
  // 2. Hash it
  const hashedOtp = await bcrypt.hash(rawOtp, 10);
  
  // 3. Set expiry to 5 minutes
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  
  // 4. Save to database
  await CustomerOTPVerification.create({
    customer_id: customerId,
    email,
    otp_code: hashedOtp,
    purpose,
    attempt_count: 0,
    expires_at: expiresAt,
  });
  
  // 5. Send Email
  await sendOTPEmail(email, rawOtp, purpose);
  
  // Write to a temporary file in parent workspace dir for easy testing
  try {
    fs.writeFileSync('../otp_temp.txt', `EMAIL: ${email}\nOTP: ${rawOtp}\nTIMESTAMP: ${new Date().toISOString()}`);
  } catch (err) {
    // Ignore write errors
  }
  
  return rawOtp;
};

// Send OTP Endpoint
export const sendOtpEndpoint = async (req, res, next) => {
  try {
    const { email, purpose } = req.body; // purpose: 'login' or 'signup'
    
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }
    
    const customer = await Customer.findOne({ where: { email } });
    
    if (purpose === 'login' && !customer) {
      return res.status(404).json({ message: 'Email address not registered. Please sign up.' });
    }
    
    if (purpose === 'signup' && customer && customer.verified) {
      return res.status(400).json({ message: 'Email registered. Please log in.' });
    }
    
    const customerId = customer ? customer.customer_id : null;
    await generateAndSendOTP(email, purpose || 'login', customerId);
    
    return res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    next(error);
  }
};

// Verify OTP Endpoint
export const verifyOtpEndpoint = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and OTP code are required' });
    }

    // Check if currently blocked
    const timeRemaining = await checkOTPBlock(email);
    if (timeRemaining !== null) {
      return res.status(429).json({ message: `Too many failed attempts. Please try again after ${timeRemaining} minutes.` });
    }
    
    // Find the latest unverified OTP for this email
    const otpRecord = await CustomerOTPVerification.findOne({
      where: { email, verified_at: null },
      order: [['created_at', 'DESC']],
    });
    
    if (!otpRecord) {
      return res.status(400).json({ message: 'No pending OTP found for this email address' });
    }
    
    // Check if expired
    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }
    
    // Increment attempts
    otpRecord.attempt_count += 1;
    await otpRecord.save();
    
    // Check code
    const isMatch = await otpRecord.compareOTP(code);
    if (!isMatch) {
      if (otpRecord.attempt_count >= 3) {
        return res.status(429).json({ message: 'Too many failed attempts. Please try again after 15 minutes.' });
      }
      return res.status(400).json({ message: `Invalid OTP code. Attempts remaining: ${3 - otpRecord.attempt_count}` });
    }
    
    // Success: Mark verified
    otpRecord.verified_at = new Date();
    await otpRecord.save();
    
    // Retrieve or verify customer
    let customer = await Customer.findOne({ where: { email } });
    if (!customer) {
      return res.status(404).json({ message: 'Associated customer profile not found.' });
    }
    
    if (!customer.verified) {
      customer.verified = true;
      await customer.save();
    }

    // Referral linkage logic
    const { referral_code } = req.body;
    if (referral_code) {
      const referral = await Referral.findOne({
        where: {
          referral_code,
          status: ['generated', 'visited']
        }
      });
      if (referral) {
        // Prevent self-referral
        if (referral.referrer_customer_id.toString() !== customer.customer_id.toString()) {
          const oldStatus = referral.status;
          referral.referred_customer_id = customer.customer_id;
          referral.status = 'visited';
          referral.visited_at = new Date();
          await referral.save();

          // Get referrer details
          const referrer = await Customer.findByPk(referral.referrer_customer_id);
          const vehicle = await Vehicle.findByPk(referral.vehicle_id);

          // Write StatusEventLog to update status log in Admin Panel
          await StatusEventLog.create({
            event_type: 'Referral Visited',
            entity_type: 'REFERRAL',
            entity_id: referral.referral_id,
            previous_status: oldStatus,
            new_status: 'visited',
            triggered_by: `customer:${customer.customer_id}`,
            payload: {
              customer: customer.name,
              customer_name: customer.name,
              customer_phone: customer.phone,
              referrer_name: referrer ? referrer.name : 'Unknown',
              vehicle_name: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Unknown',
            },
          });
        }
      }
    }
    
    // Generate JWTs
    const accessToken = generateCustomerAccessToken(customer);
    const refreshToken = generateCustomerRefreshToken(customer);
    
    // Log event
    await StatusEventLog.create({
      event_type: 'OTP Verified',
      entity_type: 'CUSTOMER',
      entity_id: customer.customer_id,
      new_status: 'verified',
      triggered_by: `customer:${customer.customer_id}`,
      payload: { email, purpose: otpRecord.purpose },
    });
    
    return res.status(200).json({
      message: 'OTP verified successfully',
      accessToken,
      refreshToken,
      customer: {
        customer_id: customer.customer_id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        customer_type: customer.customer_type,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Customer Signup
export const signupEndpoint = async (req, res, next) => {
  try {
    const { name, email, phone, customer_type, referral_code } = req.body;
    
    if (!name || !email || !phone) {
      return res.status(400).json({ message: 'Name, email, and phone are required' });
    }
    
    // Duplicate email or phone check
    const existingCustomer = await Customer.findOne({
      where: {
        [Op.or]: [{ email }, { phone }]
      }
    });

    if (existingCustomer) {
      // Check if they are signing up for the opposite role
      const currentRole = existingCustomer.customer_type;
      const requestedRole = customer_type || 'buyer';

      if (
        (currentRole === 'buyer' && requestedRole === 'lender') ||
        (currentRole === 'lender' && requestedRole === 'buyer')
      ) {
        // Upgrade customer to 'both'
        existingCustomer.customer_type = 'both';
        existingCustomer.name = name || existingCustomer.name;
        await existingCustomer.save();

        // Trigger OTP automatically to verify the update/login
        await generateAndSendOTP(existingCustomer.email, 'login', existingCustomer.customer_id);

        return res.status(200).json({
          message: 'Your account has been upgraded to support both Buyer and Lender modes. A verification OTP has been sent.',
          email: existingCustomer.email,
          upgraded: true
        });
      } else {
        return res.status(400).json({ message: 'Email or phone number is already registered. Please log in.' });
      }
    }
    
    // Create customer (unverified at first)
    const newCustomer = await Customer.create({
      name,
      email,
      phone,
      customer_type: customer_type || 'buyer',
      verified: false,
    });
    
    // Referral conversion tracking (Part 1 - capture referral code)
    if (referral_code) {
      const referral = await Referral.findOne({
        where: { referral_code, status: ['generated', 'visited'] }
      });
      
      if (referral) {
        // Prevent self-referral
        if (referral.referrer_customer_id.toString() !== newCustomer.customer_id.toString()) {
          referral.referred_customer_id = newCustomer.customer_id;
          // Keep visited status, it will convert on sale order completion
          await referral.save();
        }
      }
    }
    
    // Trigger OTP automatically
    await generateAndSendOTP(email, 'signup', newCustomer.customer_id);
    
    return res.status(201).json({
      message: 'Customer profile created. Verification OTP sent.',
      email: newCustomer.email
    });
  } catch (error) {
    next(error);
  }
};

// Customer Login
export const loginEndpoint = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }
    
    const customer = await Customer.findOne({ where: { email } });
    if (!customer) {
      return res.status(404).json({ message: 'Email not registered. Please sign up.' });
    }
    
    // Trigger OTP
    await generateAndSendOTP(email, 'login', customer.customer_id);
    
    return res.status(200).json({
      message: 'Verification OTP sent.',
      email: customer.email
    });
  } catch (error) {
    next(error);
  }
};

// Token Refresh
export const refreshEndpoint = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }
    
    jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or Expired Refresh Token' });
      }
      
      const customer = await Customer.findByPk(decoded.customer_id);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      
      const accessToken = generateCustomerAccessToken(customer);
      return res.status(200).json({ accessToken });
    });
  } catch (error) {
    next(error);
  }
};

// Get current Customer
export const getMeEndpoint = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.customer.customer_id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    return res.status(200).json({ customer });
  } catch (error) {
    next(error);
  }
};

// Admin Login
export const adminLoginEndpoint = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    const admin = await AdminUser.findOne({ where: { username } });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid administrative credentials' });
    }
    
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid administrative credentials' });
    }
    
    // Generate Admin tokens
    const accessToken = generateAdminAccessToken(admin);
    const refreshToken = generateAdminRefreshToken(admin);
    
    return res.status(200).json({
      message: 'Administrative login successful',
      accessToken,
      refreshToken,
      admin: {
        admin_id: admin.admin_id,
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get current Admin profile
export const getAdminMeEndpoint = async (req, res, next) => {
  try {
    const admin = await AdminUser.findByPk(req.admin.admin_id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    return res.status(200).json({
      admin: {
        admin_id: admin.admin_id,
        username: admin.username,
        role: admin.role,
      }
    });
  } catch (error) {
    next(error);
  }
};
