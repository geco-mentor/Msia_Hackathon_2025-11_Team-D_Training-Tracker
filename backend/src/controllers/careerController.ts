import { Request, Response } from 'express';
import { supabase } from '../config/database';
import { AuthRequest } from '../middleware/auth';

/**
 * Get all available career paths
 */
export const getCareerPaths = async (req: Request, res: Response): Promise<void> => {
    try {
        const { department } = req.query;

        let query = supabase
            .from('career_paths')
            .select('*')
            .order('name');

        if (department && department !== 'all') {
            query = query.eq('department', department);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.status(200).json({
            success: true,
            data: data || []
        });

    } catch (error: any) {
        console.error('Error fetching career paths:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch career paths' });
    }
};

/**
 * Get employee's career progression
 */
export const getCareerProgress = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const requesterId = req.user?.id;
        const requesterRole = req.user?.role;

        // Only allow user to see their own progress or admin/manager to see others
        if (userId !== requesterId && requesterRole !== 'admin') {
            // Check if requester is manager of this employee
            const { data: employee } = await supabase
                .from('employees')
                .select('manager_id')
                .eq('id', userId)
                .single();

            if (employee?.manager_id !== requesterId) {
                res.status(403).json({ success: false, message: 'Access denied' });
                return;
            }
        }

        // Get employee with career path
        const { data: emp, error: empError } = await supabase
            .from('employees')
            .select(`
                id,
                name,
                department,
                elo_rating,
                career_level,
                career_path_id,
                career_paths (
                    id,
                    name,
                    description,
                    levels
                )
            `)
            .eq('id', userId)
            .single();

        if (empError) throw empError;

        // Get completed trainings for this user
        const { data: completedTrainings, error: trainError } = await supabase
            .from('assessments')
            .select(`
                scenario_id,
                score,
                scenarios (
                    title,
                    category,
                    skill
                )
            `)
            .eq('user_id', userId)
            .eq('completed', true);

        if (trainError) throw trainError;

        const completedTitles = new Set(
            completedTrainings?.map((t: any) =>
                t.scenarios?.title || t.scenarios?.skill || t.scenarios?.category
            ).filter(Boolean)
        );

        // Parse career levels and determine progress
        const careerPath = (emp as any).career_paths;
        const levels = careerPath?.levels || [];
        const currentLevel = emp.career_level || 1;
        const eloRating = emp.elo_rating || 1000;

        const levelProgress = levels.map((level: any, idx: number) => {
            const requiredTrainings = level.required_trainings || [];
            const completedRequired = requiredTrainings.filter((t: string) =>
                completedTitles.has(t)
            );
            const meetsElo = eloRating >= (level.min_elo || 0);

            return {
                level: level.level,
                title: level.title,
                isCurrent: level.level === currentLevel,
                isCompleted: level.level < currentLevel,
                isLocked: level.level > currentLevel,
                requiredTrainings,
                completedTrainings: completedRequired,
                trainingProgress: requiredTrainings.length > 0
                    ? Math.round((completedRequired.length / requiredTrainings.length) * 100)
                    : 100,
                minElo: level.min_elo || 0,
                meetsElo
            };
        });

        res.status(200).json({
            success: true,
            data: {
                employee: {
                    id: emp.id,
                    name: emp.name,
                    department: emp.department,
                    eloRating,
                    currentLevel
                },
                careerPath: careerPath ? {
                    id: careerPath.id,
                    name: careerPath.name,
                    description: careerPath.description
                } : null,
                levels: levelProgress,
                completedTrainings: Array.from(completedTitles)
            }
        });

    } catch (error: any) {
        console.error('Error fetching career progress:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch career progress' });
    }
};

/**
 * Assign an employee to a career path (Admin/Manager only)
 */
export const assignCareerPath = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { employeeId, careerPathId } = req.body;
        const requesterId = req.user?.id;
        const requesterRole = req.user?.role;

        // Only admin or manager can assign
        if (requesterRole !== 'admin') {
            const { data: employee } = await supabase
                .from('employees')
                .select('manager_id')
                .eq('id', employeeId)
                .single();

            if (employee?.manager_id !== requesterId) {
                res.status(403).json({ success: false, message: 'Only managers can assign career paths' });
                return;
            }
        }

        const { error } = await supabase
            .from('employees')
            .update({
                career_path_id: careerPathId,
                career_level: 1 // Reset to level 1 when assigning new path
            })
            .eq('id', employeeId);

        if (error) throw error;

        res.status(200).json({
            success: true,
            message: 'Career path assigned successfully'
        });

    } catch (error: any) {
        console.error('Error assigning career path:', error);
        res.status(500).json({ success: false, message: 'Failed to assign career path' });
    }
};

/**
 * Get team members (for managers) with their career progress
 */
export const getTeamCareerProgress = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const managerId = req.user?.id;
        const requesterRole = req.user?.role;

        // Get team members (employees where manager_id = current user OR all for admin)
        let query = supabase
            .from('employees')
            .select(`
                id,
                name,
                department,
                job_title,
                elo_rating,
                career_level,
                total_points,
                career_paths (
                    name,
                    levels
                )
            `)
            .order('name');

        if (requesterRole !== 'admin') {
            query = query.eq('manager_id', managerId);
        }

        const { data: teamMembers, error } = await query;

        if (error) throw error;

        // Get completed assessments count for each member
        const teamWithProgress = await Promise.all(
            (teamMembers || []).map(async (member: any) => {
                const { count: completedCount } = await supabase
                    .from('assessments')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', member.id)
                    .eq('completed', true);

                // Determine current level title
                const levels = member.career_paths?.levels || [];
                const currentLevelData = levels.find((l: any) => l.level === member.career_level);

                return {
                    id: member.id,
                    name: member.name,
                    department: member.department,
                    jobTitle: member.job_title,
                    eloRating: member.elo_rating || 1000,
                    careerPath: member.career_paths?.name || 'Not Assigned',
                    currentLevel: member.career_level || 1,
                    currentTitle: currentLevelData?.title || 'Entry Level',
                    totalPoints: member.total_points || 0,
                    completedTrainings: completedCount || 0
                };
            })
        );

        res.status(200).json({
            success: true,
            data: teamWithProgress
        });

    } catch (error: any) {
        console.error('Error fetching team career progress:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch team progress' });
    }
};
