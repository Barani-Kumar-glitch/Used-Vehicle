import { Router } from 'express';
import {
  sendOtpEndpoint,
  verifyOtpEndpoint,
  signupEndpoint,
  loginEndpoint,
  refreshEndpoint,
  getMeEndpoint,
  adminLoginEndpoint,
  getAdminMeEndpoint
} from '../controllers/auth.controller.js';
import { verifyCustomer, verifyAdmin } from '../middleware/authJwt.js';

const router = Router();

// Customer authentication routes
router.post('/send-otp', sendOtpEndpoint);
router.post('/verify-otp', verifyOtpEndpoint);
router.post('/signup', signupEndpoint);
router.post('/login', loginEndpoint);
router.post('/refresh', refreshEndpoint);
router.get('/me', verifyCustomer, getMeEndpoint);

// Admin authentication routes
router.post('/admin/login', adminLoginEndpoint);
router.get('/admin/me', verifyAdmin, getAdminMeEndpoint);

export default router;
