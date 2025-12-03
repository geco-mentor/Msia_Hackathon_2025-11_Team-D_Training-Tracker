import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../config/database';

/**
 * Get Employee Dashboard Stats
 * GET /api/employees/dashboard
 */
export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== 'employee') {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        const { id } = req.user;

        // Fetch employee details
        const { data: employee, error } = await supabase
            .from('employees')
            .select('ranking, win_rate, streak, elo_rating')
            .eq('id', id)
            .single();

        if (error || !employee) {
            res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
            return;
        }

        // Fetch dynamic ranking from leaderboard view
        const { data: leaderboardData } = await supabase
            .from('leaderboard')
            .select('rank')
            .eq('user_id', id)
            .single();

        const currentRank = leaderboardData?.rank || employee.ranking || 0;

        // Mock data for total assessments (replace with real count when assessments table exists)
        // Actually we can fetch real count now
        const { count: totalAssessments } = await supabase
            .from('assessments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', id);

        res.status(200).json({
            success: true,
            stats: {
                ranking: currentRank,
                win_rate: employee.win_rate,
                streak: employee.streak,
                elo_rating: employee.elo_rating || 1200,
                total_assessments: totalAssessments || 0
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get All Employees (Admin only)
 * GET /api/employees/all
 */
export const getAllEmployees = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            console.log('Access denied for user:', req.user);
            res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
            return;
        }

        console.log('Fetching all employees...');
        const { data: employees, error } = await supabase
            .from('employees')
            .select('id, name, job_title, department, ranking, win_rate, streak')
            .order('name');

        if (error) {
            console.error('Database error fetching employees:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch employees'
            });
            return;
        }

        console.log(`Found ${employees?.length} employees`);

        // Transform data for dashboard
        const formattedEmployees = employees.map(emp => ({
            id: emp.id,
            name: emp.name,
            role: emp.job_title, // Using job_title as role for display
            department: emp.department || 'Unassigned',
            progress: emp.win_rate || 0, // Using win_rate as progress proxy
            status: 'Active' // Mock status for now
        }));

        res.status(200).json({
            success: true,
            employees: formattedEmployees
        });
    } catch (error) {
        console.error('Get all employees error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get Employee Details (Admin only)
 * GET /api/employees/:id/details
 */
export const getEmployeeDetails = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
            return;
        }

        const { id } = req.params;

        // Fetch employee basic info
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('id, name, job_title, department, ranking, win_rate, streak, elo_rating')
            .eq('id', id)
            .single();

        if (empError || !employee) {
            res.status(404).json({ success: false, message: 'Employee not found' });
            return;
        }

        // Fetch dynamic ranking from leaderboard view
        const { data: leaderboardData } = await supabase
            .from('leaderboard')
            .select('rank')
            .eq('user_id', id)
            .single();

        const currentRank = leaderboardData?.rank || employee.ranking || 0;

        // Update employee object with dynamic rank
        employee.ranking = currentRank;

        // Fetch all assessments for analytics
        const { data: assessments, error: assessError } = await supabase
            .from('assessments')
            .select('id, score, feedback, created_at, difficulty, scenario:scenarios(title, skill)')
            .eq('user_id', id)
            .order('created_at', { ascending: true }); // Order by date ascending for trend analysis

        if (assessError) {
            console.error('Error fetching assessments:', assessError);
        }

        const allAssessments = assessments || [];

        // 1. Calculate Skill Stats (for Radar Chart)
        const skillMap = new Map<string, { total: number; count: number }>();
        allAssessments.forEach((a: any) => {
            const skill = a.scenario?.skill || 'Unknown';
            const current = skillMap.get(skill) || { total: 0, count: 0 };
            skillMap.set(skill, {
                total: current.total + (a.score || 0),
                count: current.count + 1
            });
        });

        const skillStats = Array.from(skillMap.entries()).map(([subject, data]) => ({
            subject,
            A: Math.round(data.total / data.count), // Average score
            fullMark: 100
        }));

        // 2. Calculate Progress Data (for Line Chart)
        // Group by date to avoid too many points if multiple assessments per day
        const progressMap = new Map<string, { total: number; count: number }>();
        allAssessments.forEach((a: any) => {
            const date = new Date(a.created_at).toLocaleDateString();
            const current = progressMap.get(date) || { total: 0, count: 0 };
            progressMap.set(date, {
                total: current.total + (a.score || 0),
                count: current.count + 1
            });
        });

        const progressData = Array.from(progressMap.entries()).map(([date, data]) => ({
            date,
            score: Math.round(data.total / data.count)
        }));

        // 3. Pre vs Current Stats
        // Assuming first 3 are "Pre-training" and last 3 are "Current"
        const preTrainingAvg = allAssessments.length > 0
            ? allAssessments.slice(0, 3).reduce((sum: number, a: any) => sum + (a.score || 0), 0) / Math.min(allAssessments.length, 3)
            : 0;

        const currentAvg = allAssessments.length > 0
            ? allAssessments.slice(-3).reduce((sum: number, a: any) => sum + (a.score || 0), 0) / Math.min(allAssessments.length, 3)
            : 0;


        res.status(200).json({
            success: true,
            employee: {
                ...employee,
                assessments: allAssessments.reverse().slice(0, 10), // Return only recent 10 for the list view, reversed back to desc
                analytics: {
                    skillStats,
                    progressData,
                    preTrainingAvg: Math.round(preTrainingAvg),
                    currentAvg: Math.round(currentAvg)
                }
            }
        });

    } catch (error) {
        console.error('Get employee details error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
