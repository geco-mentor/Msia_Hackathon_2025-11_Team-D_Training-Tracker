import { Router } from 'express';
import {
    getCareerPaths,
    getCareerProgress,
    assignCareerPath,
    getTeamCareerProgress
} from '../controllers/careerController';
import { verifyToken } from '../middleware/auth';

const router = Router();

// Get all available career paths
router.get('/paths', getCareerPaths);

// Get employee's career progression (requires auth)
router.get('/progress/:userId', verifyToken, getCareerProgress);

// Assign career path to employee (requires auth - manager/admin)
router.post('/assign', verifyToken, assignCareerPath);

// Get team's career progress (for managers/admin)
router.get('/team', verifyToken, getTeamCareerProgress);

export default router;
