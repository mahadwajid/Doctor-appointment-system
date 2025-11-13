import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as labController from '../controllers/labController.js';

const router = express.Router();

// Get all lab reports
router.get('/', authenticate, labController.getAllLabReports);

// Upload lab report (Lab Staff only)
router.post('/', authenticate, authorize('LAB_STAFF', 'SUPER_ADMIN'), labController.upload.single('file'), labController.uploadLabReport);

// Get lab report by ID
router.get('/:id', authenticate, labController.getLabReportById);

// Serve uploaded files
router.use('/uploads', express.static('uploads'));

export default router;
