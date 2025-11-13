import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as doctorController from '../controllers/doctorController.js';

const router = express.Router();

// Get all active doctors
router.get('/', authenticate, doctorController.getAllDoctors);

// Get doctor by ID
router.get('/:id', authenticate, doctorController.getDoctorById);

export default router;
