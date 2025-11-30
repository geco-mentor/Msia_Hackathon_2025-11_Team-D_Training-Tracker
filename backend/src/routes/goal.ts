import express from 'express';
import * as goalController from '../controllers/goalController';

const router = express.Router();

router.post('/generate', goalController.generate);
router.get('/:userId', goalController.getGoals);
router.put('/:id', goalController.updateStatus);

export default router;
