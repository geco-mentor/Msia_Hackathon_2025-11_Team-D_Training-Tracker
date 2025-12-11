import express from 'express';
import * as jobController from '../controllers/jobController';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

// All job routes require authentication, maybe admin only?
// For now, let's just require authentication.
router.post('/analyze', verifyToken, jobController.analyzeJob);

export default router;
