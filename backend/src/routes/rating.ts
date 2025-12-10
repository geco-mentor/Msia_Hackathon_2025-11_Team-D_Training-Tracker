import { Router } from 'express';
import {
    submitRating,
    getRatingSummary,
    getCourseReviews,
    getUserRating
} from '../controllers/ratingController';
import { verifyToken } from '../middleware/auth';

const router = Router();

// Submit a course rating (requires auth)
router.post('/', verifyToken, submitRating);

// Get rating summary for a course
router.get('/summary/:scenarioId', getRatingSummary);

// Get all reviews for a course
router.get('/reviews/:scenarioId', getCourseReviews);

// Get user's own rating for a course (requires auth)
router.get('/user/:scenarioId', verifyToken, getUserRating);

export default router;
