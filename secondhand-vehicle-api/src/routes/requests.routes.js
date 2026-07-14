import { Router } from 'express';
import { createRequest, listRequests, acceptRequest, rejectRequest } from '../controllers/requests.controller.js';
import { verifyCustomer, verifyAdmin } from '../middleware/authJwt.js';

const router = Router();

// Customer endpoints
router.post('/', verifyCustomer, createRequest);

// Admin endpoints
router.get('/', verifyAdmin, listRequests);
router.post('/:id/accept', verifyAdmin, acceptRequest);
router.post('/:id/reject', verifyAdmin, rejectRequest);

export default router;
