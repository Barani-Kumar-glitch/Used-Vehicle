import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  listVehicles,
  getVehicleDetail,
  createVehicle,
  updateVehicle,
  removeVehicle,
  getVehiclePricingHistory,
  createVehiclePricing,
  getVehicleAvailability,
  createVehicleAvailability,
  uploadVehiclePhoto,
  deleteVehicle
} from '../controllers/vehicles.controller.js';
import { verifyAdmin } from '../middleware/authJwt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer storage pointing to workspace root uploads folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.resolve(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed (jpeg, jpg, png, webp, gif)'));
  }
});

const router = Router();

// Public listings
router.get('/', listVehicles);
router.get('/:id', getVehicleDetail);
router.get('/:id/pricing', getVehiclePricingHistory);
router.get('/:id/availability', getVehicleAvailability);

// Admin-only management
router.post('/upload', verifyAdmin, upload.single('photo'), uploadVehiclePhoto);
router.post('/', verifyAdmin, createVehicle);
router.patch('/:id', verifyAdmin, updateVehicle);
router.post('/:id/remove', verifyAdmin, removeVehicle);
router.post('/:id/pricing', verifyAdmin, createVehiclePricing);
router.post('/:id/availability', verifyAdmin, createVehicleAvailability);
router.delete('/:id', verifyAdmin, deleteVehicle);

export default router;
