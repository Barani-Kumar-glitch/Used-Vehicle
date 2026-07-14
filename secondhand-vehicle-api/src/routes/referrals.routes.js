import { Router } from 'express';
import {
  generateLink,
  resolveLink,
  getMyReferrals,
  listAdminReferrals,
  getAdminReferralDetail,
  updateCommissionStatus,
  createAdminReferral,
  updateReferral,
  deleteReferral
} from '../controllers/referrals.controller.js';
import { verifyCustomer, verifyAdmin } from '../middleware/authJwt.js';

const router = Router();

// Customer/Public endpoints
router.post('/generate', verifyCustomer, generateLink);
router.get('/resolve/:code', resolveLink);
router.get('/my', verifyCustomer, getMyReferrals);

// Admin-only endpoints
router.get('/admin', verifyAdmin, listAdminReferrals);
router.post('/admin', verifyAdmin, createAdminReferral);
router.patch('/admin/:id', verifyAdmin, updateReferral);
router.delete('/admin/:id', verifyAdmin, deleteReferral);
router.get('/admin/:id', verifyAdmin, getAdminReferralDetail);
router.patch('/admin/:id/commission', verifyAdmin, updateCommissionStatus);

export default router;
