import { Router } from 'express';
import {
    addCertification,
    getUserCertifications,
    updateCertification,
    deleteCertification
} from '../controllers/certificationController';
import { verifyToken } from '../middleware/auth';

const router = Router();

// Add a new certification (requires auth)
router.post('/', verifyToken, addCertification);

// Get all certifications for a user (requires auth)
router.get('/user/:userId', verifyToken, getUserCertifications);

// Update a certification (requires auth - owner only)
router.put('/:certId', verifyToken, updateCertification);

// Delete a certification (requires auth - owner only)
router.delete('/:certId', verifyToken, deleteCertification);

export default router;
