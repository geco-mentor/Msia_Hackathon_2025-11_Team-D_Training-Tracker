import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import { getUserSkills, addSkill, updateSkill, deleteSkill } from '../controllers/skillController';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// GET /api/skills - Get all skills for current user
router.get('/', getUserSkills);

// POST /api/skills - Add a new skill
router.post('/', addSkill);

// PUT /api/skills/:skillId - Update a skill
router.put('/:skillId', updateSkill);

// DELETE /api/skills/:skillId - Delete a skill
router.delete('/:skillId', deleteSkill);

export default router;
