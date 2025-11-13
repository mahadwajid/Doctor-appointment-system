import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as medicalRecordController from '../controllers/medicalRecordController.js';

const router = express.Router();

// Get all medical records
router.get('/', authenticate, medicalRecordController.getAllMedicalRecords);

// Create medical record (Doctor only)
router.post('/', authenticate, authorize('DOCTOR', 'SUPER_ADMIN'), medicalRecordController.upload.single('file'), medicalRecordController.createMedicalRecord);

// Get medical record by ID
router.get('/:id', authenticate, medicalRecordController.getMedicalRecordById);

// Serve uploaded files
router.use('/uploads', express.static('uploads'));

export default router;
