import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as patientController from '../controllers/patientController.js';

const router = express.Router();

// Get all patients
router.get('/', authenticate, patientController.getAllPatients);

// Search patients (must come before /:id route)
router.get('/search/:query', authenticate, patientController.searchPatients);

// Get patient by ID
router.get('/:id', authenticate, patientController.getPatientById);

// Create patient (Receptionist only)
router.post('/', authenticate, authorize('RECEPTIONIST', 'SUPER_ADMIN'), patientController.createPatient);

// Update patient (Super Admin only)
router.put('/:id', authenticate, authorize('SUPER_ADMIN'), patientController.updatePatient);

// Delete patient (Super Admin only)
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), patientController.deletePatient);

export default router;
