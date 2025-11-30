import express from 'express';
import * as challengeController from '../controllers/challengeController';

const router = express.Router();

router.post('/generate', challengeController.generate);
router.post('/submit', challengeController.submit);

export default router;
