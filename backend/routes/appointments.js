import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as appointmentController from '../controllers/appointmentController.js';

const router = express.Router();

// Get all appointments
router.get('/', authenticate, appointmentController.getAllAppointments);

// Get waiting appointments
router.get('/waiting', authenticate, appointmentController.getWaitingAppointments);

// Call next patient (Doctor only)
router.post('/call-next', authenticate, appointmentController.callNextPatient);

// Complete appointment
router.post('/:id/complete', authenticate, appointmentController.completeAppointment);

// Get appointment by ID
router.get('/:id', authenticate, appointmentController.getAppointmentById);

export default router;
