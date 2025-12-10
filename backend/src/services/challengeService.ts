import { model } from './aiService';
import { supabase } from '../config/database';

export const generateChallenge = async (jobTitle: string, difficulty: string, userId?: string, isPersonalized: boolean = false) => {
    const context = isPersonalized
        ? `Generate a personalized learning quest for a user interested in "${jobTitle}" (as a topic/skill) at "${difficulty}" level.`
        : `Generate a "Capture The Flag" style GenAI challenge for a "${jobTitle}" at "${difficulty}" difficulty.`;

    const prompt = `
        ${context}
        The challenge should test basic GenAI skills like Prompt structuring, Summarization, Rewriting, or Extracting information.
        
        Return ONLY a valid JSON object with this structure (no markdown formatting):
        {
            "title": "A short, catchy title for the challenge",
            "category": "The category of the challenge (e.g., Prompt Engineering, Data Analysis, Security)",
            "skill": "Specific skill name (e.g., Prompt Engineering)",
            "scenario_text": "A short 1-3 sentence micro-scenario context.",
            "task": "The specific instruction for the user.",
            "type": "text" or "multiple_choice",
            "options": ["Option A", "Option B", "Option C", "Option D"] (only if type is multiple_choice, otherwise null),
            "rubric": {
                "criteria": ["Criterion 1", "Criterion 2"],
                "ideal_response_keywords": ["keyword1", "keyword2"]
            },
            "hint": "A helpful hint."
        }
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown code blocks if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const challengeData = JSON.parse(text);

        // Save to database
        const { data, error } = await supabase
            .from('scenarios')
            .insert({
                skill: challengeData.skill,
                difficulty: difficulty,
                scenario_text: challengeData.scenario_text,
                task: challengeData.task,
                type: challengeData.type,
                options: challengeData.options,
                rubric: challengeData.rubric,
                hint: challengeData.hint,
                is_personalized: isPersonalized,
                creator_id: isPersonalized ? userId : null,
                title: challengeData.title,
                category: challengeData.category
            })
            .select()
            .single();

        if (error) throw error;
        return data;

    } catch (error) {
        console.error('Error generating challenge:', error);
        throw new Error('Failed to generate challenge');
    }
};

export const getMainChallenges = async (userId?: string) => {
    // First get all non-personalized scenarios
    const { data: allScenarios, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('is_personalized', false)
        .order('created_at', { ascending: false });

    if (error) throw error;

    // If no userId provided, return all scenarios (admin view or fallback)
    if (!userId) {
        return allScenarios;
    }

    // Get user's department
    const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('department')
        .eq('id', userId)
        .single();

    if (empError || !employee) {
        console.warn('Could not find employee department, returning all scenarios');
        return allScenarios;
    }

    // Get user's department and department ID
    const userDept = employee.department?.toLowerCase() || '';
    console.log(`DEBUG: Filtering scenarios for department: ${userDept}`);

    // Also get the department ID for matching against department_ids array
    let userDeptId: string | null = null;
    if (userDept) {
        const { data: deptData } = await supabase
            .from('departments')
            .select('id')
            .ilike('name', userDept)
            .single();
        userDeptId = deptData?.id || null;
    }

    // Filter scenarios:
    // - GENERAL category: visible to all
    // - TRAINING category: only if matches user's department (by name or department_ids)
    // - Check both category and title for department matching
    const filteredScenarios = (allScenarios || []).filter((scenario: any) => {
        const category = (scenario.category || '').toLowerCase();
        const title = (scenario.title || '').toLowerCase();

        // GENERAL category is visible to everyone
        if (category === 'general') {
            return true;
        }

        // Check if scenario's department_ids includes the user's department
        const scenarioDeptIds = scenario.department_ids || [];
        if (userDeptId && Array.isArray(scenarioDeptIds) && scenarioDeptIds.includes(userDeptId)) {
            return true;
        }

        // TRAINING category - check if it's for user's department by name matching
        if (category.startsWith('training')) {
            // Check if the category or title contains the user's department
            // e.g., "TRAINING -sales" should only show for Sales department
            const categoryDept = category.replace('training', '').replace('-', '').trim();
            const titleDept = title.replace('training', '').replace('-', '').trim();

            // Match if category contains department name or title contains department name
            if (categoryDept && userDept.includes(categoryDept)) return true;
            if (titleDept && userDept.includes(titleDept)) return true;
            if (userDept && category.includes(userDept)) return true;
            if (userDept && title.includes(userDept)) return true;

            return false;
        }

        // For other categories, show all
        return true;
    });

    console.log(`DEBUG: Filtered ${allScenarios?.length || 0} scenarios to ${filteredScenarios.length} for user ${userId}`);
    return filteredScenarios;
};

export const getPersonalizedChallenges = async (userId: string) => {
    const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('is_personalized', true)
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

export const deleteChallenge = async (id: string) => {
    const { error } = await supabase
        .from('scenarios')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
};

export const evaluateResponse = async (scenarioId: string, userResponse: string, userId: string) => {
    try {
        // Fetch scenario
        const { data: scenario, error: fetchError } = await supabase
            .from('scenarios')
            .select('*')
            .eq('id', scenarioId)
            .single();

        if (fetchError || !scenario) throw new Error('Scenario not found');

        const prompt = `
            Evaluate the following user response for a GenAI challenge.
            
            Task: ${scenario.task}
            Scenario: ${scenario.scenario_text}
            Rubric: ${JSON.stringify(scenario.rubric)}
            
            User Response: "${userResponse}"
            
            Return ONLY a valid JSON object with:
            {
                "score": number (0-100),
                "feedback": "Constructive feedback explaining the score and how to improve."
            }
        `;

        // Use multi-model evaluation
        const results = await model.evaluateWithMultipleModels(prompt);

        let totalScore = 0;
        let validCount = 0;
        let combinedFeedback = "";

        for (const text of results) {
            try {
                console.log('DEBUG: Raw model response:', text);
                // Try to extract JSON object using regex
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                const jsonStr = jsonMatch ? jsonMatch[0] : text.replace(/```json/g, '').replace(/```/g, '').trim();

                const evaluation = JSON.parse(jsonStr);

                if (typeof evaluation.score === 'number') {
                    totalScore += evaluation.score;
                    validCount++;
                    combinedFeedback += `[Model ${validCount}]: ${evaluation.feedback}\n`;
                }
            } catch (e) {
                console.warn('Failed to parse one model response:', e);
            }
        }

        if (validCount === 0) {
            console.error('All models failed to produce valid JSON.');
            throw new Error("Failed to parse evaluation from any model.");
        }

        const averageScore = Math.round(totalScore / validCount);

        // Save assessment
        const { data, error } = await supabase
            .from('assessments')
            .insert({
                user_id: userId,
                scenario_id: scenarioId,
                score: averageScore,
                feedback: combinedFeedback.trim(),
                user_response: userResponse,
                difficulty: scenario.difficulty
            })
            .select()
            .single();

        if (error) throw error;

        // Update solves count if passed
        if (averageScore >= 70) {
            await supabase.rpc('increment_solves', { row_id: scenarioId });
            // If RPC doesn't exist, we can do it manually but RPC is better for concurrency.
            // Since I can't easily add RPC, I'll do a simple update.
            const { data: current } = await supabase.from('scenarios').select('solves').eq('id', scenarioId).single();
            if (current) {
                await supabase.from('scenarios').update({ solves: (current.solves || 0) + 1 }).eq('id', scenarioId);
            }
        }

        // --- UPDATE EMPLOYEE STATS ---
        // 1. Fetch current stats
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('total_points, win_rate, streak, elo_rating, id')
            .eq('id', userId)
            .single();

        if (employee) {
            // Calculate new Total Points
            const newPoints = (employee.total_points || 0) + averageScore;

            // Calculate new Win Rate
            // Fetch total assessments count for this user
            const { count: totalAssessments } = await supabase
                .from('assessments')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            // Fetch total wins (score >= 70)
            const { count: totalWins } = await supabase
                .from('assessments')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .gte('score', 70);

            // Note: The current assessment is already inserted, so totalAssessments includes it.
            // totalWins also includes it if score >= 70 because we just inserted it.

            const currentTotalAssessments = totalAssessments || 0;
            const currentTotalWins = totalWins || 0;

            const newWinRate = currentTotalAssessments > 0
                ? Math.round((currentTotalWins / currentTotalAssessments) * 100)
                : 0;

            // Calculate Streak
            // We need to check the date of the LAST assessment before this one.
            // Actually, a simpler way is to check if there was an assessment yesterday.
            // But we just inserted the current assessment, so we need to be careful.

            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            const todayStr = today.toISOString().split('T')[0];

            // Check if there is ANY assessment from yesterday
            const { data: yesterdayActivity } = await supabase
                .from('assessments')
                .select('created_at')
                .eq('user_id', userId)
                .gte('created_at', yesterdayStr + 'T00:00:00')
                .lt('created_at', todayStr + 'T00:00:00')
                .limit(1);

            // Check if there is ANY assessment from today (excluding the one we just made? No, streak is daily activity)
            // If we already have a streak, and we did something today, the streak shouldn't increment AGAIN if it already incremented today.
            // But we don't store "last_streak_update_date".
            // Logic:
            // If (activity yesterday) -> streak = streak + 1 (unless already incremented today?)
            // To avoid double incrementing on the same day, we can check if this is the FIRST activity of today.

            const { count: todayActivityCount } = await supabase
                .from('assessments')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .gte('created_at', todayStr + 'T00:00:00');

            let newStreak = employee.streak || 0;

            // If this is the FIRST activity today (count === 1 because we just inserted one)
            if (todayActivityCount === 1) {
                if (yesterdayActivity && yesterdayActivity.length > 0) {
                    // Continued streak
                    newStreak += 1;
                } else {
                    // Broken streak or new streak
                    // Check if it's a brand new streak (0) or reset
                    // If no activity yesterday, streak resets to 1 (for today)
                    newStreak = 1;
                }
            }
            // If todayActivityCount > 1, we've already done something today, so streak is already up to date for today.
            // We don't increment it again.

            // Update Employee
            // --- ELO RATING CALCULATION ---
            const K_FACTOR = 32;
            const DIFFICULTY_RATINGS: Record<string, number> = {
                'Easy': 1000,
                'Medium': 1200,
                'Hard': 1500
            };

            const currentElo = employee.elo_rating || 1200;
            const opponentElo = DIFFICULTY_RATINGS[scenario.difficulty] || 1200;

            // Expected score: 1 / (1 + 10^((Rb - Ra) / 400))
            const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - currentElo) / 400));

            // Actual score: 1 if passed (>= 70), 0 if failed
            const actualScore = averageScore >= 70 ? 1 : 0;

            const newElo = Math.round(currentElo + K_FACTOR * (actualScore - expectedScore));

            await supabase
                .from('employees')
                .update({
                    total_points: newPoints,
                    win_rate: newWinRate,
                    streak: newStreak,
                    elo_rating: newElo
                })
                .eq('id', userId);
        }

        return data;

    } catch (error) {
        console.error('Error evaluating response:', error);
        throw new Error('Failed to evaluate response');
    }
};
