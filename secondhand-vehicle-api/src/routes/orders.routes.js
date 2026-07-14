import { Router } from 'express';
import {
  listSaleOrders,
  createSaleOrder,
  getSaleOrderDetail,
  updateSaleOrder,
  listRentals,
  createRental,
  returnRental,
  recordPayment,
  createExchangeOrder,
  updateRentalBooking,
  deleteRentalBooking,
  deleteSaleOrder
} from '../controllers/orders.controller.js';
import { verifyAdmin, verifyEither } from '../middleware/authJwt.js';

const router = Router();

// Sales endpoints
router.get('/sale', verifyEither, listSaleOrders);
router.post('/sale', verifyAdmin, createSaleOrder);
router.get('/sale/:id', verifyEither, getSaleOrderDetail);
router.patch('/sale/:id', verifyAdmin, updateSaleOrder);
router.delete('/sale/:id', verifyAdmin, deleteSaleOrder);

// Rentals endpoints
router.get('/rental', verifyEither, listRentals);
router.post('/rental', verifyAdmin, createRental);
router.patch('/rental/:id', verifyAdmin, updateRentalBooking);
router.delete('/rental/:id', verifyAdmin, deleteRentalBooking);
router.post('/rental/:id/return', verifyAdmin, returnRental);

// Payments & Exchanges
router.post('/payment', verifyAdmin, recordPayment);
router.post('/exchange', verifyAdmin, createExchangeOrder);

export default router;
