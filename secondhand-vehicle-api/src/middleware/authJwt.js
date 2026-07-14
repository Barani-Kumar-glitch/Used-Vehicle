import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Token generation helpers
export const generateCustomerAccessToken = (customer) => {
  return jwt.sign(
    { 
      customer_id: customer.customer_id, 
      phone: customer.phone,
      email: customer.email,
      role: 'customer' 
    },
    env.JWT_SECRET,
    { expiresIn: '24h' } // 24 hours
  );
};

export const generateCustomerRefreshToken = (customer) => {
  return jwt.sign(
    { customer_id: customer.customer_id, role: 'customer' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' } // 7 days
  );
};

export const generateAdminAccessToken = (admin) => {
  return jwt.sign(
    { 
      admin_id: admin.admin_id, 
      username: admin.username, 
      role: admin.role 
    },
    env.ADMIN_JWT_SECRET,
    { expiresIn: '24h' } // 24 hours
  );
};

export const generateAdminRefreshToken = (admin) => {
  return jwt.sign(
    { admin_id: admin.admin_id, role: admin.role },
    env.ADMIN_JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

// Express Middleware for verifying Customer JWT
export const verifyCustomer = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Access Token Required' });
  }

  jwt.verify(token, env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or Expired Customer Token' });
    }
    req.customer = decoded;
    next();
  });
};

// Express Middleware for verifying Admin JWT
export const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Admin Token Required' });
  }

  jwt.verify(token, env.ADMIN_JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or Expired Admin Token' });
    }
    req.admin = decoded;
    next();
  });
};

// Express Middleware for verifying either Admin or Customer JWT
export const verifyEither = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token Required' });
  }

  // Try admin first
  jwt.verify(token, env.ADMIN_JWT_SECRET, (adminErr, adminDecoded) => {
    if (!adminErr) {
      req.admin = adminDecoded;
      return next();
    }
    
    // Try customer
    jwt.verify(token, env.JWT_SECRET, (custErr, custDecoded) => {
      if (custErr) {
        return res.status(401).json({ message: 'Invalid or Expired Token' });
      }
      req.customer = custDecoded;
      next();
    });
  });
};
