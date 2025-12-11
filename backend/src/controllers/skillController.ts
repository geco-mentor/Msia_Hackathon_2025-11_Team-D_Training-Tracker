import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../config/database';

/**
 * Get all skills for the current user
 * GET /api/skills
 */
export const getUserSkills = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { data: skills, error } = await supabase
            .from('employee_skills')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log(`[Skills] Fetched ${skills?.length || 0} skills for user ${userId}`);
        res.status(200).json({
            success: true,
            data: skills || []
        });

    } catch (error: any) {
        console.error('Error fetching skills:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch skills' });
    }
};

/**
 * Add a new skill
 * POST /api/skills
 */
export const addSkill = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { skillName, proficiencyLevel, description } = req.body;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        if (!skillName || !proficiencyLevel) {
            res.status(400).json({ success: false, message: 'Skill name and proficiency level are required' });
            return;
        }

        if (proficiencyLevel < 1 || proficiencyLevel > 5) {
            res.status(400).json({ success: false, message: 'Proficiency level must be between 1 and 5' });
            return;
        }

        const { data, error } = await supabase
            .from('employee_skills')
            .insert({
                user_id: userId,
                skill_name: skillName.trim(),
                proficiency_level: proficiencyLevel,
                description: description || null
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                res.status(409).json({ success: false, message: 'You already have this skill added' });
                return;
            }
            throw error;
        }

        console.log(`[Skills] Added skill "${skillName}" for user ${userId}`);
        res.status(201).json({
            success: true,
            message: 'Skill added successfully',
            data
        });

    } catch (error: any) {
        console.error('Error adding skill:', error);
        res.status(500).json({ success: false, message: 'Failed to add skill' });
    }
};

/**
 * Update a skill
 * PUT /api/skills/:skillId
 */
export const updateSkill = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { skillId } = req.params;
        const { proficiencyLevel, description } = req.body;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        // Verify ownership
        const { data: existing } = await supabase
            .from('employee_skills')
            .select('user_id')
            .eq('id', skillId)
            .single();

        if (!existing || existing.user_id !== userId) {
            res.status(403).json({ success: false, message: 'You can only update your own skills' });
            return;
        }

        const updateData: any = {};
        if (proficiencyLevel !== undefined) {
            if (proficiencyLevel < 1 || proficiencyLevel > 5) {
                res.status(400).json({ success: false, message: 'Proficiency level must be between 1 and 5' });
                return;
            }
            updateData.proficiency_level = proficiencyLevel;
        }
        if (description !== undefined) {
            updateData.description = description;
        }

        const { data, error } = await supabase
            .from('employee_skills')
            .update(updateData)
            .eq('id', skillId)
            .select()
            .single();

        if (error) throw error;

        console.log(`[Skills] Updated skill ${skillId} for user ${userId}`);
        res.status(200).json({
            success: true,
            message: 'Skill updated successfully',
            data
        });

    } catch (error: any) {
        console.error('Error updating skill:', error);
        res.status(500).json({ success: false, message: 'Failed to update skill' });
    }
};

/**
 * Delete a skill
 * DELETE /api/skills/:skillId
 */
export const deleteSkill = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { skillId } = req.params;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        // Verify ownership
        const { data: existing } = await supabase
            .from('employee_skills')
            .select('user_id')
            .eq('id', skillId)
            .single();

        if (!existing || existing.user_id !== userId) {
            res.status(403).json({ success: false, message: 'You can only delete your own skills' });
            return;
        }

        const { error } = await supabase
            .from('employee_skills')
            .delete()
            .eq('id', skillId);

        if (error) throw error;

        console.log(`[Skills] Deleted skill ${skillId} for user ${userId}`);
        res.status(200).json({
            success: true,
            message: 'Skill deleted successfully'
        });

    } catch (error: any) {
        console.error('Error deleting skill:', error);
        res.status(500).json({ success: false, message: 'Failed to delete skill' });
    }
};
