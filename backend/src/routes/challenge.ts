import express from 'express';
import * as challengeController from '../controllers/challengeController';

const router = express.Router();

router.post('/generate', challengeController.generate);
router.post('/submit', challengeController.submit);
router.get('/main', challengeController.getMain);
router.get('/personalized/:userId', challengeController.getPersonalized);
router.delete('/:id', challengeController.deleteQuest);

export default router;
