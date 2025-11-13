import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as prescriptionController from '../controllers/prescriptionController.js';

const router = express.Router();

// Get all prescriptions
router.get('/', authenticate, prescriptionController.getAllPrescriptions);

// Create prescription (Doctor only)
router.post('/', authenticate, authorize('DOCTOR', 'SUPER_ADMIN'), prescriptionController.createPrescription);

// Get prescription by ID
router.get('/:id', authenticate, prescriptionController.getPrescriptionById);

export default router;
