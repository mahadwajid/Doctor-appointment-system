import express from 'express';
import * as queueController from '../controllers/queueController.js';

const router = express.Router();

// Get current queue status (public endpoint for display screen)
router.get('/status', queueController.getQueueStatus);

export default router;
