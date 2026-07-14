import { Router } from 'express';
import {
  listDrivers,
  getDriverDetail,
  createDriver,
  updateDriver,
  assignDriverLocation,
  blockDriverAvailability,
  deleteDriver
} from '../controllers/drivers.controller.js';
import { verifyAdmin } from '../middleware/authJwt.js';

const router = Router();

// Public listings
router.get('/', listDrivers);
router.get('/:id', getDriverDetail);

// Admin-only management
router.post('/', verifyAdmin, createDriver);
router.patch('/:id', verifyAdmin, updateDriver);
router.post('/:id/location', verifyAdmin, assignDriverLocation);
router.post('/:id/availability', verifyAdmin, blockDriverAvailability);
router.delete('/:id', verifyAdmin, deleteDriver);

export default router;
