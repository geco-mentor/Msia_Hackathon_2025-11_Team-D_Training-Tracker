import { Request, Response } from 'express';
import { supabase } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getAnalyticsOverview = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
            res.status(403).json({ success: false, message: 'Access denied. Admin or Manager only.' });
            return;
        }

        // Get filter parameters
        const { department: filterDepartment, curriculum: filterCurriculum } = req.query;

        // 0. Fetch Employees (used for multiple metrics)
        const { data: employees, error: empError } = await supabase
            .from('employees')
            .select('id, name, department, win_rate, total_points, elo_rating');

        if (empError) throw empError;
        const totalEmployees = employees?.length || 0;

        // 1. Completion Rate (Actual Scenario Completion %)
        // Fetch all scenarios count
        const { count: totalScenarios, error: scenarioError } = await supabase
            .from('scenarios')
            .select('*', { count: 'exact', head: true });

        // Fetch all unique completed assessments
        const { data: uniqueCompletions, error: uniqueError } = await supabase
            .from('assessments')
            .select('user_id, scenario_id')
            .eq('completed', true);

        // Calculate distinct completions (User X completed Scenario Y)
        const distinctCompleted = new Set(uniqueCompletions?.map((a: any) => `${a.user_id}-${a.scenario_id}`)).size;

        // Formula: Total Unique Completions / (Total Employees * Total Scenarios)
        const totalPossibleCompletions = (totalEmployees * (totalScenarios || 1));
        const avgCompletionRate = totalPossibleCompletions > 0
            ? (distinctCompleted / totalPossibleCompletions) * 100
            : 0;

        // 2. Total Assessments
        const { count: totalAssessments, error: assessError } = await supabase
            .from('assessments')
            .select('*', { count: 'exact', head: true });

        if (assessError) throw assessError;

        // 3. Activity Timeline (Last 30 days) - By Department
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: activityData, error: activityError } = await supabase
            .from('assessments')
            .select(`
                created_at,
                employees!inner (
                    department
                )
            `)
            .gte('created_at', thirtyDaysAgo.toISOString());

        if (activityError) throw activityError;

        // Group by date AND department
        // Structure: { date: "2023-10-01", Sales: 2, Engineering: 5, ... }
        const activityMap = new Map<string, Record<string, number>>();
        const allDepartments = new Set<string>();

        activityData?.forEach((item: any) => {
            const date = new Date(item.created_at).toISOString().split('T')[0];
            const dept = (item.employees as any)?.department || 'Unknown';
            allDepartments.add(dept);

            if (!activityMap.has(date)) {
                activityMap.set(date, {});
            }
            const dateEntry = activityMap.get(date)!;
            dateEntry[dept] = (dateEntry[dept] || 0) + 1;
        });

        const activityTimeline = Array.from(activityMap.entries())
            .map(([date, counts]) => {
                // Ensure all departments have a value (0 if missing) for properly stacked chart
                const entry: any = { date };
                allDepartments.forEach(dept => {
                    entry[dept] = counts[dept] || 0;
                });
                return entry;
            })
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

        // 10. Get Departments list for filter
        const uniqueDepartments = [...new Set((employees || []).map((emp: any) => emp.department).filter(Boolean))];
        const departments = uniqueDepartments.map((name, idx) => ({ id: idx + 1, name }));

        // 11. Get Curriculums (Scenarios) list for filter
        const { data: scenariosData, error: scenariosError } = await supabase
            .from('scenarios')
            .select('id, title, category, skill');

        if (scenariosError) throw scenariosError;

        const curriculums = (scenariosData || []).map((s: any) => ({
            id: s.id,
            title: s.title || s.category || 'Untitled Module'
        }));

        // 12. Pre vs Post Assessment comparison by curriculum
        // Fetch pre-assessments with scores
        const { data: preAssessmentsData, error: preError } = await supabase
            .from('pre_assessments')
            .select(`
                baseline_score,
                scenario_id,
                user_id,
                completed,
                scenarios (id, title, category),
                employees!inner (department)
            `)
            .eq('completed', true);

        if (preError) console.error('Pre-assessment error:', preError);

        // Fetch post-assessments with scores
        const { data: postAssessmentsData, error: postError } = await supabase
            .from('assessments')
            .select(`
                score,
                scenario_id,
                user_id,
                completed,
                scenarios (id, title, category, rubric, skill),
                employees!inner (department)
            `)
            .eq('completed', true);

        if (postError) console.error('Post-assessment error:', postError);

        // Group by curriculum/scenario
        const preVsPostMap = new Map<string, { preTotal: number; preCount: number; postTotal: number; postCount: number; curriculum: string }>();

        (preAssessmentsData || []).forEach((item: any) => {
            const scenarioId = item.scenario_id;
            const curriculumName = item.scenarios?.title || item.scenarios?.category || 'Unknown';
            const dept = (item.employees as any)?.department;

            // Apply filters
            if (filterDepartment && filterDepartment !== 'all' && dept !== filterDepartment) return;
            if (filterCurriculum && filterCurriculum !== 'all' && scenarioId !== filterCurriculum) return;

            const current = preVsPostMap.get(scenarioId) || { preTotal: 0, preCount: 0, postTotal: 0, postCount: 0, curriculum: curriculumName };
            current.preTotal += item.baseline_score || 0;
            current.preCount += 1;
            preVsPostMap.set(scenarioId, current);
        });

        (postAssessmentsData || []).forEach((item: any) => {
            const scenarioId = item.scenario_id;
            const curriculumName = item.scenarios?.title || item.scenarios?.category || 'Unknown';
            const dept = (item.employees as any)?.department;

            // Apply filters
            if (filterDepartment && filterDepartment !== 'all' && dept !== filterDepartment) return;
            if (filterCurriculum && filterCurriculum !== 'all' && scenarioId !== filterCurriculum) return;

            const current = preVsPostMap.get(scenarioId) || { preTotal: 0, preCount: 0, postTotal: 0, postCount: 0, curriculum: curriculumName };
            current.postTotal += item.score || 0;
            current.postCount += 1;
            preVsPostMap.set(scenarioId, current);
        });

        const preVsPostAssessment = Array.from(preVsPostMap.entries())
            .filter(([_, data]) => data.preCount > 0 || data.postCount > 0)
            .map(([scenarioId, data]) => ({
                id: scenarioId,
                curriculum: data.curriculum.length > 15 ? data.curriculum.substring(0, 15) + '...' : data.curriculum,
                fullTitle: data.curriculum,
                preScore: data.preCount > 0 ? Math.round(data.preTotal / data.preCount) : 0,
                postScore: data.postCount > 0 ? Math.round(data.postTotal / data.postCount) : 0
            }))
            .slice(0, 6);

        // 13. Skills Gap Analysis - Average score per skill from rubric.module
        const skillsGapMap = new Map<string, { total: number; count: number }>();

        (postAssessmentsData || []).forEach((item: any) => {
            const scenarioId = item.scenario_id;
            const dept = (item.employees as any)?.department;

            // Apply filters (same as Pre vs Post Assessment)
            if (filterDepartment && filterDepartment !== 'all' && dept !== filterDepartment) return;
            if (filterCurriculum && filterCurriculum !== 'all' && scenarioId !== filterCurriculum) return;

            // Extract module skills from rubric (AI-generated topic keywords)
            const rubric = item.scenarios?.rubric;
            let skills: string[] = [];

            if (rubric?.module && Array.isArray(rubric.module) && rubric.module.length > 0) {
                skills = rubric.module;
            } else {
                // Fallback to title if no module rubrics
                skills = [item.scenarios?.title || 'General'];
            }

            // Add the score to each skill category
            skills.forEach((skill: string) => {
                const current = skillsGapMap.get(skill) || { total: 0, count: 0 };
                current.total += item.score || 0;
                current.count += 1;
                skillsGapMap.set(skill, current);
            });
        });

        const skillsGap = Array.from(skillsGapMap.entries())
            .map(([skill, data]) => ({
                skill: skill.length > 12 ? skill.substring(0, 12) + '...' : skill,
                avgScore: data.count > 0 ? Math.round(data.total / data.count) : 0
            }))
            .sort((a, b) => a.avgScore - b.avgScore) // Lowest scores first (biggest gaps)
            .slice(0, 5);

        // 14. Module Effectiveness - Improvement from pre to post per curriculum
        const moduleEffectiveness = Array.from(preVsPostMap.entries())
            .filter(([_, data]) => data.preCount > 0 && data.postCount > 0)
            .map(([_, data]) => {
                const preScore = data.preCount > 0 ? Math.round(data.preTotal / data.preCount) : 0;
                const postScore = data.postCount > 0 ? Math.round(data.postTotal / data.postCount) : 0;
                return {
                    curriculum: data.curriculum.length > 20 ? data.curriculum.substring(0, 20) + '...' : data.curriculum,
                    preScore,
                    postScore,
                    improvement: postScore - preScore
                };
            })
            .sort((a, b) => b.improvement - a.improvement)
            .slice(0, 5);

        // 15, 16, 17 - Unused metrics removed (Improvement Trend, At-Risk, Active Learners)


        // 18. Skill Heatmap (Department x Skill Adoption Rate)
        // REAL CALCULATION: Adoption Rate = % of employees considered "Expert" per department per skill
        // Expert Criteria: Score >= 70% OR has related certification OR has related badge

        // Step 1: Get all employees with their department (certs/badges are optional)
        let employeeCredsMap = new Map<string, { dept: string; certs: string[]; badges: string[] }>();

        // Try to get certs/badges, but fallback gracefully if columns don't exist
        const { data: allEmployeesWithCreds, error: empCredsError } = await supabase
            .from('employees')
            .select('id, department');

        if (empCredsError) {
            console.error('Error fetching employees for heatmap:', empCredsError);
        } else {
            // Try to get certifications from separate table
            const { data: certData } = await supabase
                .from('employee_certifications')
                .select('user_id, name');

            const certsByUser = new Map<string, string[]>();
            (certData || []).forEach((c: any) => {
                const existing = certsByUser.get(c.user_id) || [];
                existing.push(c.name);
                certsByUser.set(c.user_id, existing);
            });

            (allEmployeesWithCreds || []).forEach((emp: any) => {
                employeeCredsMap.set(emp.id, {
                    dept: emp.department || 'Unknown',
                    certs: certsByUser.get(emp.id) || [],
                    badges: [] // Badges can be added later if needed
                });
            });
        }

        // Step 3: Get all unique skills from scenarios
        const allSkills = [...new Set((scenariosData || []).map((s: any) => s.skill || s.title || 'General'))] as string[];

        // Step 4: Define skill-to-cert/badge mapping for multi-factor scoring
        const skillKeywords: Record<string, string[]> = {
            'Sales Strategy': ['sales', 'negotiation', 'closer', 'hubspot', 'salesforce', 'account'],
            'Software Development': ['developer', 'coding', 'programming', 'aws', 'cloud', 'scrum', 'kubernetes', 'code ninja', 'engineer'],
            'Cybersecurity Awareness': ['security', 'cyber', 'cissp', 'ethical hacker', 'ceh', 'sentinel'],
            'Generative AI': ['ai', 'generative', 'machine learning', 'prompt', 'gpt'],
            'Risk Management': ['risk', 'frm', 'compliance', 'audit', 'cpa', 'cfa'],
            'Business Operations': ['operations', 'pmp', 'project', 'itil', 'six sigma', 'lean', 'process'],
            'Digital Marketing': ['marketing', 'google ads', 'seo', 'analytics', 'content', 'social'],
        };

        // Step 5: Calculate adoption rate per department per skill
        // Structure: { dept -> { skill -> { experts: Set<empId>, total: Set<empId> } } }
        const adoptionMap = new Map<string, Map<string, { experts: Set<string>; total: Set<string> }>>();

        // Initialize with all departments from employees (not from creds query)
        const allDepts = [...new Set((allEmployeesWithCreds || employees || []).map((e: any) => e.department || 'Unknown'))].filter(Boolean);
        console.log('[Heatmap Debug] Initializing depts:', allDepts);

        allDepts.forEach(dept => {
            const skillMap = new Map<string, { experts: Set<string>; total: Set<string> }>();
            allSkills.forEach(skill => {
                skillMap.set(skill, { experts: new Set(), total: new Set() });
            });
            adoptionMap.set(dept, skillMap);
        });

        // Helper: Check if employee has related cert/badge for a skill
        const hasRelatedCredential = (certs: string[], badges: string[], skill: string): boolean => {
            const keywords = skillKeywords[skill] || [skill.toLowerCase()];
            const allCreds = [...certs, ...badges].map(c => c.toLowerCase());
            return keywords.some(kw => allCreds.some(cred => cred.includes(kw)));
        };

        // Process assessments to find experts
        (postAssessmentsData || []).forEach((item: any) => {
            const empId = item.user_id;
            // Get department from assessment's employee relation OR from our map
            const dept = (item.employees as any)?.department || employeeCredsMap.get(empId)?.dept || 'Unknown';
            const empCreds = employeeCredsMap.get(empId) || { dept, certs: [], badges: [] };

            const skill = item.scenarios?.skill || item.scenarios?.title || 'General';
            const score = item.score || 0;

            // Ensure dept exists in adoptionMap
            if (!adoptionMap.has(dept)) {
                const skillMap = new Map<string, { experts: Set<string>; total: Set<string> }>();
                allSkills.forEach(s => skillMap.set(s, { experts: new Set(), total: new Set() }));
                adoptionMap.set(dept, skillMap);
            }

            const deptSkillMap = adoptionMap.get(dept)!;

            // Ensure skill exists
            if (!deptSkillMap.has(skill)) {
                deptSkillMap.set(skill, { experts: new Set(), total: new Set() });
            }

            const skillData = deptSkillMap.get(skill)!;

            // Add to total (this employee has taken this skill's assessment)
            skillData.total.add(empId);

            // Check if expert: Score >= 70 OR has related certification
            const hasCert = hasRelatedCredential(empCreds.certs, empCreds.badges, skill);
            const isExpert = score >= 70 || hasCert;
            if (isExpert) {
                skillData.experts.add(empId);
            }
        });

        // Convert to output format
        const skillHeatmap: any[] = [];
        adoptionMap.forEach((skillMap, dept) => {
            const skillsList: any[] = [];
            skillMap.forEach((data, skill) => {
                // Adoption rate = experts / total (or 0 if no data)
                const adoptionRate = data.total.size > 0
                    ? parseFloat((data.experts.size / data.total.size).toFixed(2))
                    : 0;
                skillsList.push({
                    name: skill,
                    value: adoptionRate,
                    experts: data.experts.size,
                    total: data.total.size
                });
            });
            // Always include if department exists (even if 0 data)
            skillHeatmap.push({
                name: dept,
                skills: skillsList.filter(s => s.total > 0)
            });
        });

        console.log('[Heatmap Debug] allSkills:', allSkills);
        console.log('[Heatmap Debug] allDepts:', allDepts);
        console.log('[Heatmap Debug] skillHeatmap length:', skillHeatmap.length);
        if (skillHeatmap.length > 0) {
            console.log('[Heatmap Debug] First dept skills:', skillHeatmap[0]);
        }

        // 19. Training ROI (Return on Investment)
        // ROI = (Value - Cost) / Cost. 
        // Proxy: (Avg Post Score - Avg Pre Score) / Avg Pre Score * 100
        // We already have preVsPostMap.
        let totalPreSum = 0;
        let totalPostSum = 0;
        let pairCount = 0;

        preVsPostMap.forEach((data) => {
            if (data.preCount > 0 && data.postCount > 0) {
                // Averages per curriculum
                const avgPre = data.preTotal / data.preCount;
                const avgPost = data.postTotal / data.postCount;
                totalPreSum += avgPre;
                totalPostSum += avgPost;
                pairCount++;
            }
        });

        const globalAvgPre = pairCount > 0 ? totalPreSum / pairCount : 0;
        const globalAvgPost = pairCount > 0 ? totalPostSum / pairCount : 0;

        // Avoid division by zero
        const trainingROI = globalAvgPre > 0
            ? Math.round(((globalAvgPost - globalAvgPre) / globalAvgPre) * 100)
            : 0;


        console.log('Analytics data prepared: Success');

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
                eloDistribution,
                // New fields for missing charts
                departments,
                curriculums,
                preVsPostAssessment,
                skillsGap,
                moduleEffectiveness,
                // New additions for Enhanced Admin Dashboard
                skillHeatmap,
                trainingROI
            }
        });

    } catch (error: any) {
        console.error('Analytics error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
    }
};

export const getOperativeDetails = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            res.status(403).json({ success: false, message: 'Admin access required' });
            return;
        }

        const { curriculum } = req.query;
        if (!curriculum) {
            res.status(400).json({ success: false, message: 'Curriculum ID required' });
            return;
        }

        const { data: preData, error: preError } = await supabase
            .from('pre_assessments')
            .select(`
                user_id,
                baseline_score,
                employees (id, name, department)
            `)
            .eq('scenario_id', curriculum)
            .eq('completed', true);

        if (preError) throw preError;

        const { data: postData, error: postError } = await supabase
            .from('assessments')
            .select(`
                user_id,
                score,
                employees (id, name, department)
            `)
            .eq('scenario_id', curriculum)
            .eq('completed', true);

        if (postError) throw postError;

        const operativeMap = new Map<string, any>();

        preData?.forEach((item: any) => {
            const emp = item.employees;
            if (!emp) return;
            const current = operativeMap.get(emp.id) || {
                id: emp.id,
                name: emp.name,
                department: emp.department || 'Unknown',
                preScore: 0,
                postScore: 0
            };
            current.preScore = item.baseline_score;
            operativeMap.set(emp.id, current);
        });

        postData?.forEach((item: any) => {
            const emp = item.employees;
            if (!emp) return;
            const current = operativeMap.get(emp.id) || {
                id: emp.id,
                name: emp.name,
                department: emp.department || 'Unknown',
                preScore: 0,
                postScore: 0
            };
            current.postScore = item.score;
            operativeMap.set(emp.id, current);
        });

        const operatives = Array.from(operativeMap.values())
            .filter(op => op.preScore > 0 || op.postScore > 0);

        res.status(200).json({ success: true, data: operatives });

    } catch (error: any) {
        console.error('Operative details error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch operative details' });
    }
};

export const getCompetencyPredictions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { department } = req.query;

        // Fetch employees
        let query = supabase
            .from('employees')
            .select('id, name, department, win_rate, streak, elo_rating, last_login_at');

        if (department && department !== 'all') {
            query = query.eq('department', department);
        }

        const { data: employees, error } = await query;

        if (error) {
            console.error('Error fetching employees for prediction:', error);
            res.status(500).json({ success: false, message: error.message });
            return;
        }

        // Fetch Data for Heuristics
        const employeeIds = employees?.map(e => e.id) || [];

        // 1. Career Goals
        const { data: goals } = await supabase
            .from('employee_career_goals')
            .select('user_id, goal_title')
            .in('user_id', employeeIds);

        const goalMap = new Map<string, string>();
        goals?.forEach((g: any) => goalMap.set(g.user_id, g.goal_title));

        // 2. Certifications
        const { data: certs } = await supabase
            .from('employee_certifications')
            .select('user_id, name')
            .in('user_id', employeeIds);

        const certMap = new Map<string, number>();
        certs?.forEach((c: any) => {
            const current = certMap.get(c.user_id) || 0;
            certMap.set(c.user_id, current + 1);
        });

        const predictions = employees?.map((emp: any) => {
            let status = 'Stable';
            let riskFactors = [];
            let growthFactors = [];

            // Heuristic Logic
            const winRate = emp.win_rate || 0;
            const streak = emp.streak || 0;
            const elo = emp.elo_rating || 1000;

            const hasGoal = goalMap.has(emp.id);
            const goalTitle = goalMap.get(emp.id);
            const certCount = certMap.get(emp.id) || 0;

            // 1. Check for At Risk
            if (winRate < 0.50) riskFactors.push('Low Win Rate'); // Relaxed from 0.45
            if (streak === 0 && winRate < 0.6) riskFactors.push('Inactive Streak');

            // NEW: Goal vs Cert Mismatch
            if (hasGoal && certCount === 0) {
                riskFactors.push('Uncertified for Goal');
            }

            if (riskFactors.length > 0) {
                status = 'At Risk';
            }

            // 2. Check for Accelerating (overrides At Risk if strong signals)
            if (winRate > 0.65) growthFactors.push('High Win Rate'); // Relaxed from 0.70
            if (streak > 2) growthFactors.push('Consistent Learning');
            if (elo > 1200) growthFactors.push('Top ELO Tier');
            if (hasGoal && certCount > 0) growthFactors.push('Aligned Growth'); // Goal + Certs = Good

            if (growthFactors.length >= 2 || (winRate > 0.8)) {
                status = 'Accelerating';
            }

            // Projected ELO (Simple Linear Projection)
            let projectedElo = elo;
            if (status === 'Accelerating') projectedElo += 45;
            else if (status === 'At Risk') projectedElo -= 25;
            else projectedElo += 15;

            return {
                id: emp.id,
                name: emp.name,
                department: emp.department || 'Unknown',
                currentElo: elo,
                projectedElo,
                status,
                factors: status === 'Accelerating' ? growthFactors : riskFactors,
                goal: goalTitle // Pass goal to frontend
            };
        });

        res.status(200).json({ success: true, data: predictions });

    } catch (error: any) {
        console.error('Prediction error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate predictions' });
    }
};
