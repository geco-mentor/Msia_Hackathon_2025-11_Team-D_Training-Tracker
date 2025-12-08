import { Request, Response } from 'express';
import { supabase } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getAnalyticsOverview = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            res.status(403).json({ success: false, message: 'Admin access required' });
            return;
        }

        // 1. Completion Rate (Win Rate)
        const { data: employees, error: empError } = await supabase
            .from('employees')
            .select('id, name, department, win_rate, total_points, elo_rating');

        if (empError) throw empError;

        const totalEmployees = employees?.length || 0;
        const avgCompletionRate = totalEmployees > 0
            ? employees.reduce((sum: number, emp: any) => sum + (emp.win_rate || 0), 0) / totalEmployees
            : 0;

        // 2. Total Assessments
        const { count: totalAssessments, error: assessError } = await supabase
            .from('assessments')
            .select('*', { count: 'exact', head: true });

        if (assessError) throw assessError;

        // 3. Activity Timeline (Last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: activityData, error: activityError } = await supabase
            .from('assessments')
            .select('created_at')
            .gte('created_at', thirtyDaysAgo.toISOString());

        if (activityError) throw activityError;

        // Group by date
        const activityMap = new Map<string, number>();
        activityData?.forEach((item: any) => {
            const date = new Date(item.created_at).toISOString().split('T')[0];
            activityMap.set(date, (activityMap.get(date) || 0) + 1);
        });

        const activityTimeline = Array.from(activityMap.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // 4. Skill Distribution
        const { data: skillData, error: skillError } = await supabase
            .from('assessments')
            .select(`
                scenario_id,
                scenarios (
                    skill
                )
            `);

        if (skillError) throw skillError;

        const skillMap = new Map<string, number>();
        skillData?.forEach((item: any) => {
            const skill = item.scenarios?.skill || 'Unknown';
            skillMap.set(skill, (skillMap.get(skill) || 0) + 1);
        });

        const skillDistribution = Array.from(skillMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        // 5. Department Performance (Avg Score by Department)
        const { data: deptAssessments, error: deptError } = await supabase
            .from('assessments')
            .select(`
                score,
                user_id,
                employees!inner (
                    department
                )
            `);

        if (deptError) throw deptError;

        const deptScoreMap = new Map<string, { total: number; count: number }>();
        deptAssessments?.forEach((item: any) => {
            const dept = (item.employees as any)?.department || 'Unknown';
            const current = deptScoreMap.get(dept) || { total: 0, count: 0 };
            deptScoreMap.set(dept, {
                total: current.total + (item.score || 0),
                count: current.count + 1
            });
        });

        const departmentPerformance = Array.from(deptScoreMap.entries())
            .map(([department, data]) => ({
                department,
                avgScore: data.count > 0 ? Math.round(data.total / data.count) : 0
            }))
            .sort((a, b) => b.avgScore - a.avgScore)
            .slice(0, 6);

        // 6. Difficulty Breakdown
        const { data: difficultyData, error: diffError } = await supabase
            .from('assessments')
            .select('difficulty');

        if (diffError) throw diffError;

        const diffMap = new Map<string, number>();
        difficultyData?.forEach((item: any) => {
            const difficulty = item.difficulty || 'Unknown';
            diffMap.set(difficulty, (diffMap.get(difficulty) || 0) + 1);
        });

        const difficultyBreakdown = Array.from(diffMap.entries())
            .map(([difficulty, count]) => ({ difficulty, count }))
            .sort((a, b) => {
                const order: Record<string, number> = { 'Easy': 1, 'Medium': 2, 'Hard': 3, 'Expert': 4 };
                return (order[a.difficulty] || 99) - (order[b.difficulty] || 99);
            });

        // 7. Monthly Trends (Last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const { data: monthlyData, error: monthlyError } = await supabase
            .from('assessments')
            .select('created_at')
            .gte('created_at', sixMonthsAgo.toISOString());

        if (monthlyError) throw monthlyError;

        const monthlyMap = new Map<string, number>();
        monthlyData?.forEach((item: any) => {
            const date = new Date(item.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
        });

        const monthlyTrends = Array.from(monthlyMap.entries())
            .map(([month, assessments]) => ({ month, assessments }))
            .sort((a, b) => a.month.localeCompare(b.month));

        // 8. Top Performers (by total_points)
        const topPerformers = (employees || [])
            .filter((emp: any) => emp.total_points > 0)
            .sort((a: any, b: any) => (b.total_points || 0) - (a.total_points || 0))
            .slice(0, 10)
            .map((emp: any) => ({
                id: emp.id,
                name: emp.name,
                department: emp.department || 'Unknown',
                total_points: emp.total_points || 0,
                elo_rating: emp.elo_rating || 1000
            }));

        // 9. Elo Distribution (for histogram)
        const eloRanges = [
            { min: 0, max: 800, label: '< 800' },
            { min: 800, max: 1000, label: '800-1000' },
            { min: 1000, max: 1200, label: '1000-1200' },
            { min: 1200, max: 1400, label: '1200-1400' },
            { min: 1400, max: 9999, label: '1400+' }
        ];

        const eloDistribution = eloRanges.map(range => {
            const count = (employees || []).filter((emp: any) => {
                const elo = emp.elo_rating || 1000;
                return elo >= range.min && elo < range.max;
            }).length;
            return { range: range.label, count };
        });

        res.status(200).json({
            success: true,
            data: {
                avgCompletionRate: Math.round(avgCompletionRate),
                totalAssessments: totalAssessments || 0,
                activityTimeline,
                skillDistribution,
                departmentPerformance,
                difficultyBreakdown,
                monthlyTrends,
                topPerformers,
                eloDistribution
            }
        });

    } catch (error: any) {
        console.error('Analytics error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
    }
};
