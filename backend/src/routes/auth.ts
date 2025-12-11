import { Router } from 'express';
import { register, login, logout, getCurrentUser } from '../controllers/authController';
import { verifyToken } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected routes
router.get('/me', verifyToken, getCurrentUser);

export default router;
