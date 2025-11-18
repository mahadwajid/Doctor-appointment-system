import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

// All routes require Super Admin
router.use(authenticate);
router.use(authorize('SUPER_ADMIN'));

// Get all users
router.get('/users', adminController.getUsers);

// Create doctor
router.post('/doctors', adminController.createDoctor);

// Get all doctors
router.get('/doctors', adminController.getDoctors);

// Update doctor
router.put('/doctors/:id', adminController.updateDoctor);

// Delete doctor
router.delete('/doctors/:id', adminController.deleteDoctor);

// Create receptionist
router.post('/receptionists', adminController.createReceptionist);

// Create lab staff
router.post('/lab-staff', adminController.createLabStaff);

// Delete any user (Super Admin only)
router.delete('/users/:id', adminController.deleteUser);

// Delete patient (Super Admin only, bypasses active appointment check)
router.delete('/patients/:id', adminController.deletePatient);

// Get system statistics
router.get('/stats', adminController.getStats);

// Get system logs
router.get('/logs', adminController.getSystemLogs);

export default router;
