import { Router } from 'express';
import {
  getAdminSummary,
  getActivityLogs,
  getStatusEvents,
  listCustomers,
  verifyCustomerDocument,
  listPayments,
  createCustomer,
  createPayment,
  updateCustomer,
  deleteCustomer,
  updatePayment,
  deletePayment
} from '../controllers/admin.controller.js';
import { verifyAdmin } from '../middleware/authJwt.js';

const router = Router();

// Apply verifyAdmin middleware to all admin routes
router.use(verifyAdmin);

router.get('/summary', getAdminSummary);
router.get('/activity-log', getActivityLogs);
router.get('/status-events', getStatusEvents); // Can also be mounted under /api/status-events in app.js
router.get('/customers', listCustomers);
router.post('/customers', createCustomer);
router.patch('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);
router.post('/customers/verify-document/:id', verifyCustomerDocument);
router.get('/payments', listPayments);
router.post('/payments', createPayment);
router.patch('/payments/:id', updatePayment);
router.delete('/payments/:id', deletePayment);

export default router;
