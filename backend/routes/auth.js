import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';

const router = express.Router();

// Register (Super Admin only)
router.post('/register', authenticate, authController.register);

// Login
router.post('/login', authController.login);

// Get current user
router.get('/me', authenticate, authController.getMe);

export default router;
