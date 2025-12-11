import express from 'express';
import { getAnalyticsOverview, getOperativeDetails, getCompetencyPredictions } from '../controllers/analyticsController';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

router.get('/overview', verifyToken, getAnalyticsOverview);
router.get('/operatives', verifyToken, getOperativeDetails);
router.get('/predictions', verifyToken, getCompetencyPredictions);

export default router;
