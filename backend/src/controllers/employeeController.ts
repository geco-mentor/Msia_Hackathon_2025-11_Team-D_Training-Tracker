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
 * Get Global Leaderboard (Ranked by ELO)
 * GET /api/employees/leaderboard
 */
export const getGlobalLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        // Fetch employees sorted by ELO rating descending
        const { data: leaderboard, error } = await supabase
            .from('employees')
            .select('id, name, username, department, elo_rating, win_rate, total_points, job_title')
            .order('elo_rating', { ascending: false })
            .limit(100); // Top 100

        if (error) {
            console.error('Error fetching leaderboard:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
            return;
        }

        // Add rank index
        const rankedData = leaderboard?.map((player, index) => ({
            ...player,
            rank: index + 1
        })) || [];

        res.status(200).json({
            success: true,
            leaderboard: rankedData
        });

    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
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

/**
 * Get My Profile (Current Employee)
 * GET /api/employees/profile
 */
export const getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== 'employee') {
            res.status(403).json({ success: false, message: 'Access denied' });
            return;
        }

        const { id } = req.user;
        console.log('Fetching profile for employee:', id);

        // Fetch employee basic info
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('id, name, username, job_title, department, ranking, win_rate, streak, elo_rating, total_points, skills_profile')
            .eq('id', id)
            .single();

        if (empError || !employee) {
            console.error('Error fetching employee:', empError);
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

        // Fetch all assessments for analytics
        const { data: assessments, error: assessError } = await supabase
            .from('assessments')
            .select('id, score, feedback, created_at, difficulty, scenario:scenarios(title, skill, category)')
            .eq('user_id', id)
            .order('created_at', { ascending: true });

        if (assessError) {
            console.error('Error fetching assessments:', assessError);
        }

        const allAssessments = assessments || [];

        // 1. Calculate Skill Stats (for Radar Chart)
        const skillMap = new Map<string, { total: number; count: number }>();
        allAssessments.forEach((a: any) => {
            const skill = a.scenario?.skill || 'General';
            const current = skillMap.get(skill) || { total: 0, count: 0 };
            skillMap.set(skill, {
                total: current.total + (a.score || 0),
                count: current.count + 1
            });
        });

        const skillData = Array.from(skillMap.entries()).map(([subject, data]) => ({
            subject,
            A: Math.round(data.total / data.count),
            fullMark: 100
        }));

        // 2. Calculate Module Progress (by category)
        const categoryMap = new Map<string, { completed: number; total: number }>();
        allAssessments.forEach((a: any) => {
            const category = a.scenario?.category || 'General';
            const current = categoryMap.get(category) || { completed: 0, total: 0 };
            categoryMap.set(category, {
                completed: current.completed + ((a.score || 0) >= 70 ? 1 : 0),
                total: current.total + 1
            });
        });

        // Also fetch all unique categories from scenarios to show modules
        const { data: allScenarios } = await supabase
            .from('scenarios')
            .select('category, skill')
            .not('category', 'is', null);

        const uniqueCategories = new Set<string>();
        allScenarios?.forEach((s: any) => {
            if (s.category) uniqueCategories.add(s.category);
        });

        const moduleColors = [
            'from-purple-500 to-cyan-500',
            'from-blue-500 to-teal-500',
            'from-indigo-500 to-purple-500',
            'from-cyan-500 to-blue-500',
            'from-pink-500 to-rose-500',
            'from-green-500 to-emerald-500'
        ];

        const modules = Array.from(uniqueCategories).map((category, idx) => {
            const stats = categoryMap.get(category) || { completed: 0, total: 0 };
            const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
            return {
                name: category,
                progress,
                completedCount: stats.completed,
                totalCount: stats.total,
                status: progress >= 100 ? 'COMPLETE' : progress > 0 ? 'IN_PROGRESS' : 'INITIALIZE',
                color: moduleColors[idx % moduleColors.length]
            };
        });

        // 3. Calculate stats
        const totalAssessments = allAssessments.length;
        const completedAssessments = allAssessments.filter((a: any) => (a.score || 0) >= 70).length;
        const averageScore = totalAssessments > 0
            ? Math.round(allAssessments.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / totalAssessments)
            : 0;

        // Determine rank title based on elo_rating
        const eloRating = employee.elo_rating || 1200;
        let rankTitle = 'RECRUIT';
        if (eloRating >= 2000) rankTitle = 'ELITE';
        else if (eloRating >= 1800) rankTitle = 'EXPERT';
        else if (eloRating >= 1600) rankTitle = 'HACKER';
        else if (eloRating >= 1400) rankTitle = 'OPERATIVE';
        else if (eloRating >= 1200) rankTitle = 'AGENT';

        console.log('Profile data compiled successfully');

        res.status(200).json({
            success: true,
            profile: {
                id: employee.id,
                name: employee.name,
                username: employee.username,
                job_title: employee.job_title,
                department: employee.department,
                ranking: currentRank,
                elo_rating: eloRating,
                total_points: employee.total_points || 0,
                win_rate: employee.win_rate || 0,
                streak: employee.streak || 0,
                rankTitle,
                stats: {
                    totalScore: employee.total_points || 0,
                    completedMissions: completedAssessments,
                    totalAssessments,
                    averageScore
                },
                skillData: skillData.length > 0 ? skillData : [
                    { subject: 'Prompt Engineering', A: 0, fullMark: 100 },
                    { subject: 'Summarization', A: 0, fullMark: 100 },
                    { subject: 'Data Analysis', A: 0, fullMark: 100 },
                    { subject: 'Critical Thinking', A: 0, fullMark: 100 },
                    { subject: 'Communication', A: 0, fullMark: 100 }
                ],
                modules: modules.length > 0 ? modules : []
            }
        });

    } catch (error) {
        console.error('Get my profile error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Get Global Leaderboard
 * GET /api/employees/leaderboard
 */
export const getLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(403).json({ success: false, message: 'Access denied' });
            return;
        }

        const { data: leaderboard, error } = await supabase
            .from('employees')
            .select('id, name, username, elo_rating, ranking, win_rate')
            .order('elo_rating', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error fetching leaderboard:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
            return;
        }

        res.status(200).json({
            success: true,
            leaderboard: leaderboard.map((emp, index) => ({
                ...emp,
                rank: index + 1 // Calculate rank dynamically based on order
            }))
        });

    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};