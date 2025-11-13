import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as patientController from '../controllers/patientController.js';

const router = express.Router();

// Get all patients
router.get('/', authenticate, patientController.getAllPatients);

// Get patient by ID
router.get('/:id', authenticate, patientController.getPatientById);

// Create patient (Receptionist only)
router.post('/', authenticate, authorize('RECEPTIONIST', 'SUPER_ADMIN'), patientController.createPatient);

// Search patients
router.get('/search/:query', authenticate, patientController.searchPatients);

export default router;
