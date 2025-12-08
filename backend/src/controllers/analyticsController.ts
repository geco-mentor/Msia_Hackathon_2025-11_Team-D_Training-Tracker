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

        // 4. Pre vs Post Assessment Comparison (replacing Skill Distribution)
        // Get query params for filtering
        const departmentFilter = req.query.department as string | undefined;
        const curriculumFilter = req.query.curriculum as string | undefined;

        // Fetch all departments for filter dropdown
        const { data: departmentsData } = await supabase
            .from('departments')
            .select('id, name')
            .order('name');

        // Fetch all curriculums (scenarios with titles) for filter dropdown
        const { data: curriculumsData } = await supabase
            .from('scenarios')
            .select('id, title, department_id')
            .not('title', 'is', null)
            .order('title');

        // Build pre-assessment query
        let preAssessmentQuery = supabase
            .from('pre_assessments')
            .select(`
                scenario_id,
                baseline_score,
                user_id,
                scenarios!inner (
                    id,
                    title,
                    department_id
                ),
                employees!inner (
                    department
                )
            `)
            .eq('completed', true);

        // Build post-assessment query
        let postAssessmentQuery = supabase
            .from('assessments')
            .select(`
                scenario_id,
                score,
                user_id,
                scenarios!inner (
                    id,
                    title,
                    department_id
                ),
                employees!inner (
                    department
                )
            `);

        // Apply department filter if specified
        if (departmentFilter && departmentFilter !== 'all') {
            preAssessmentQuery = preAssessmentQuery.eq('employees.department', departmentFilter);
            postAssessmentQuery = postAssessmentQuery.eq('employees.department', departmentFilter);
        }

        // Apply curriculum filter if specified
        if (curriculumFilter && curriculumFilter !== 'all') {
            preAssessmentQuery = preAssessmentQuery.eq('scenario_id', curriculumFilter);
            postAssessmentQuery = postAssessmentQuery.eq('scenario_id', curriculumFilter);
        }

        const { data: preData, error: preError } = await preAssessmentQuery;
        if (preError) {
            console.error('Pre-assessment query error:', preError);
        }

        const { data: postData, error: postError } = await postAssessmentQuery;
        if (postError) {
            console.error('Post-assessment query error:', postError);
        }

        // Aggregate pre-assessment scores by scenario
        const preScoreMap = new Map<string, { total: number; count: number; title: string }>();
        (preData || []).forEach((item: any) => {
            const scenarioId = item.scenario_id;
            const title = item.scenarios?.title || 'Unknown';
            const current = preScoreMap.get(scenarioId) || { total: 0, count: 0, title };
            preScoreMap.set(scenarioId, {
                total: current.total + (item.baseline_score || 0),
                count: current.count + 1,
                title
            });
        });

        // Aggregate post-assessment scores by scenario
        const postScoreMap = new Map<string, { total: number; count: number; title: string }>();
        (postData || []).forEach((item: any) => {
            const scenarioId = item.scenario_id;
            const title = item.scenarios?.title || 'Unknown';
            const current = postScoreMap.get(scenarioId) || { total: 0, count: 0, title };
            postScoreMap.set(scenarioId, {
                total: current.total + (item.score || 0),
                count: current.count + 1,
                title
            });
        });

        // Combine into preVsPostAssessment array
        const allScenarioIds = new Set([...preScoreMap.keys(), ...postScoreMap.keys()]);
        const preVsPostAssessment = Array.from(allScenarioIds).map(scenarioId => {
            const preStats = preScoreMap.get(scenarioId);
            const postStats = postScoreMap.get(scenarioId);
            const title = preStats?.title || postStats?.title || 'Unknown';
            return {
                curriculum: title.length > 20 ? title.substring(0, 20) + '...' : title,
                fullTitle: title,
                scenarioId,
                preScore: preStats && preStats.count > 0 ? Math.round(preStats.total / preStats.count) : 0,
                postScore: postStats && postStats.count > 0 ? Math.round(postStats.total / postStats.count) : 0
            };
        }).sort((a, b) => a.curriculum.localeCompare(b.curriculum));

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

        // 6. Skills Gap Analysis (avg score by skill, lowest first)
        const { data: skillAssessments, error: skillError } = await supabase
            .from('assessments')
            .select(`
                score,
                scenarios!inner (
                    skill
                )
            `);

        if (skillError) console.error('Skills gap query error:', skillError);

        const skillScoreMap = new Map<string, { total: number; count: number }>();
        (skillAssessments || []).forEach((item: any) => {
            const skill = item.scenarios?.skill || 'General';
            const current = skillScoreMap.get(skill) || { total: 0, count: 0 };
            skillScoreMap.set(skill, {
                total: current.total + (item.score || 0),
                count: current.count + 1
            });
        });

        const skillsGap = Array.from(skillScoreMap.entries())
            .map(([skill, data]) => ({
                skill,
                avgScore: data.count > 0 ? Math.round(data.total / data.count) : 0
            }))
            .sort((a, b) => a.avgScore - b.avgScore) // Lowest first (gaps)
            .slice(0, 8);

        // 7. At-Risk Employees (avg score < 50)
        const { data: employeeAssessments, error: empAssessError } = await supabase
            .from('assessments')
            .select(`
                user_id,
                score,
                created_at,
                employees!inner (
                    id,
                    name,
                    department
                )
            `)
            .order('created_at', { ascending: false });

        if (empAssessError) console.error('At-risk query error:', empAssessError);

        const empScoreMap = new Map<string, {
            id: string;
            name: string;
            department: string;
            scores: number[];
            dates: Date[];
        }>();

        (employeeAssessments || []).forEach((item: any) => {
            const emp = item.employees;
            if (!emp) return;
            const existing = empScoreMap.get(emp.id) || {
                id: emp.id,
                name: emp.name,
                department: emp.department || 'Unknown',
                scores: [] as number[],
                dates: [] as Date[]
            };
            existing.scores.push(item.score || 0);
            existing.dates.push(new Date(item.created_at));
            empScoreMap.set(emp.id, existing);
        });

        const atRiskEmployees = Array.from(empScoreMap.values())
            .map(emp => {
                const avgScore = emp.scores.length > 0
                    ? Math.round(emp.scores.reduce((a, b) => a + b, 0) / emp.scores.length)
                    : 0;
                // Determine trend: declining if recent scores are lower than older ones
                let trend: 'declining' | 'stable' | 'improving' = 'stable';
                if (emp.scores.length >= 2) {
                    const recent = emp.scores.slice(0, Math.ceil(emp.scores.length / 2));
                    const older = emp.scores.slice(Math.ceil(emp.scores.length / 2));
                    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
                    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
                    if (recentAvg < olderAvg - 5) trend = 'declining';
                    else if (recentAvg > olderAvg + 5) trend = 'improving';
                }
                return {
                    id: emp.id,
                    name: emp.name,
                    department: emp.department,
                    avgScore,
                    trend,
                    assessmentCount: emp.scores.length
                };
            })
            .filter(emp => emp.avgScore < 50 || emp.trend === 'declining')
            .sort((a, b) => a.avgScore - b.avgScore)
            .slice(0, 10);

        // 8. Module Effectiveness (pre->post improvement per curriculum)
        const moduleEffectiveness = Array.from(allScenarioIds).map(scenarioId => {
            const preStats = preScoreMap.get(scenarioId);
            const postStats = postScoreMap.get(scenarioId);
            const title = preStats?.title || postStats?.title || 'Unknown';
            const preAvg = preStats && preStats.count > 0 ? Math.round(preStats.total / preStats.count) : 0;
            const postAvg = postStats && postStats.count > 0 ? Math.round(postStats.total / postStats.count) : 0;
            return {
                curriculum: title.length > 25 ? title.substring(0, 25) + '...' : title,
                fullTitle: title,
                preScore: preAvg,
                postScore: postAvg,
                improvement: postAvg - preAvg
            };
        })
            .filter(m => m.preScore > 0 || m.postScore > 0) // Only modules with data
            .sort((a, b) => b.improvement - a.improvement) // Best improvements first
            .slice(0, 6);

        // 9. Improvement Trend (monthly avg scores, not counts)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const { data: trendData, error: trendError } = await supabase
            .from('assessments')
            .select('score, created_at')
            .gte('created_at', sixMonthsAgo.toISOString());

        if (trendError) console.error('Improvement trend query error:', trendError);

        const trendMap = new Map<string, { total: number; count: number }>();
        (trendData || []).forEach((item: any) => {
            const date = new Date(item.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const current = trendMap.get(monthKey) || { total: 0, count: 0 };
            trendMap.set(monthKey, {
                total: current.total + (item.score || 0),
                count: current.count + 1
            });
        });

        const improvementTrend = Array.from(trendMap.entries())
            .map(([month, data]) => ({
                month,
                avgScore: data.count > 0 ? Math.round(data.total / data.count) : 0
            }))
            .sort((a, b) => a.month.localeCompare(b.month));

        // 10. Top Performers (by total_points)
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

        res.status(200).json({
            success: true,
            data: {
                avgCompletionRate: Math.round(avgCompletionRate),
                totalAssessments: totalAssessments || 0,
                activityTimeline,
                preVsPostAssessment,
                departments: departmentsData || [],
                curriculums: (curriculumsData || []).map((c: any) => ({ id: c.id, title: c.title })),
                departmentPerformance,
                skillsGap,
                atRiskEmployees,
                moduleEffectiveness,
                improvementTrend,
                topPerformers
            }
        });

    } catch (error: any) {
        console.error('Analytics error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
    }
};
