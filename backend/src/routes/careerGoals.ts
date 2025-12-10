import { Router } from 'express';
import {
    getCareerGoals,
    createCareerGoal,
    updateCareerGoal,
    deleteCareerGoal,
    getGrowthActionItems,
    generateSelfAssessment
} from '../controllers/careerGoalsController';
import { verifyToken } from '../middleware/auth';

const router = Router();

// Get user's career goals
router.get('/:userId', verifyToken, getCareerGoals);

// Create new career goal with AI roadmap
router.post('/', verifyToken, createCareerGoal);

// Generate self-assessment for a topic
router.post('/generate-assessment', verifyToken, generateSelfAssessment);

// Update career goal
router.put('/:id', verifyToken, updateCareerGoal);

// Delete career goal
router.delete('/:id', verifyToken, deleteCareerGoal);

// Get dynamic action items for Growth tab
router.get('/growth/action-items/:userId', verifyToken, getGrowthActionItems);

export default router;
