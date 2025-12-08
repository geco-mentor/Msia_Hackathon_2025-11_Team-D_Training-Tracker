import express from 'express';
import { getDashboardStats, getAllEmployees, getEmployeeDetails, getMyProfile } from '../controllers/employeeController';
import { verifyToken as authenticateToken } from '../middleware/auth';

const router = express.Router();

// Protected routes
router.get('/profile', authenticateToken, getMyProfile); // Must be before :id routes
router.get('/dashboard', authenticateToken, getDashboardStats);
router.get('/all', authenticateToken, getAllEmployees);
router.get('/:id/details', authenticateToken, getEmployeeDetails);

export default router;

