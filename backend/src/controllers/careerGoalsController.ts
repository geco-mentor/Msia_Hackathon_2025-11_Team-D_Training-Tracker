import { Request, Response } from 'express';
import { supabase } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { generateCareerRoadmap, generateCareerGoalReason } from '../services/awsService';

interface CareerGoal {
    id: string;
    user_id: string;
    goal_title: string;
    goal_description: string | null;
    target_timeframe: string;
    generated_roadmap: any;
    recommended_certifications: string[];
    recommended_assessments: string[];
    status: string;
    created_at: string;
    updated_at: string;
}

// Retry helper with 10 retries and 1.5s interval
const withRetry = async <T>(
    fn: () => Promise<T>,
    context: string,
    maxRetries: number = 10,
    delayMs: number = 1500
): Promise<T> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[CareerGoals] ${context} - Attempt ${attempt}/${maxRetries}`);
            const result = await fn();
            console.log(`[CareerGoals] ${context} - Success on attempt ${attempt}`);
            return result;
        } catch (error: any) {
            lastError = error;
            console.error(`[CareerGoals] ${context} - Attempt ${attempt} failed:`, error.message);

            if (attempt < maxRetries) {
                console.log(`[CareerGoals] ${context} - Waiting ${delayMs}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    throw lastError || new Error(`${context} failed after ${maxRetries} attempts`);
};

// Get user's career goals
export const getCareerGoals = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;

        console.log('[CareerGoals] Getting goals for user:', userId);

        const { data, error } = await supabase
            .from('employee_career_goals')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[CareerGoals] Error fetching goals:', error);
            res.status(500).json({ success: false, message: error.message });
            return;
        }

        res.json({ success: true, data: data || [] });
    } catch (error: any) {
        console.error('[CareerGoals] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create a new career goal with AI roadmap
export const createCareerGoal = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        let { userId, goalDescription } = req.body;
        const { goalTitle, targetTimeframe } = req.body;

        // Use authenticated user ID if available
        if (req.user?.id) {
            userId = req.user.id;
        }

        console.log('[CareerGoals] Creating goal for user:', userId, 'Goal:', goalTitle);

        if (!userId || !goalTitle) {
            res.status(400).json({ success: false, message: 'User ID and goal title are required' });
            return;
        }

        // Fetch user's current data for context
        const { data: userData, error: userError } = await supabase
            .from('employees')
            .select('job_title, job_description, department, skills_profile')
            .eq('id', userId)
            .single();

        if (userError) {
            console.error('[CareerGoals] Error fetching user:', userError);
            res.status(500).json({ success: false, message: 'Failed to fetch user data. Please ensure your profile is set up.' });
            return;
        }

        // Auto-generate "Why this goal?" if missing
        if (!goalDescription) {
            console.log('[CareerGoals] Goal description missing. Auto-generating with AI...');
            goalDescription = await withRetry(
                () => generateCareerGoalReason(
                    userData.job_title || 'Employee',
                    goalTitle,
                    userData.skills_profile
                ),
                'Generate Goal Reason'
            );
            console.log('[CareerGoals] Generated reason:', goalDescription);
        }

        // Fetch user's assessment feedback for weaknesses
        const { data: feedbackData } = await supabase
            .from('pre_assessments')
            .select('personalized_feedback')
            .eq('user_id', userId)
            .not('personalized_feedback', 'is', null)
            .order('created_at', { ascending: false })
            .limit(5);

        const weaknesses: string[] = [];
        if (feedbackData) {
            feedbackData.forEach((f: any) => {
                if (f.personalized_feedback?.weaknesses) {
                    weaknesses.push(...f.personalized_feedback.weaknesses);
                }
            });
        }

        // Fetch user's completed trainings to consider in roadmap
        const { data: completedAssessments } = await supabase
            .from('assessments')
            .select('scenario_id, scenarios(title, skill)')
            .eq('user_id', userId);

        const completedSkills: string[] = [];
        if (completedAssessments) {
            completedAssessments.forEach((a: any) => {
                if (a.scenarios?.skill) {
                    completedSkills.push(a.scenarios.skill);
                }
                if (a.scenarios?.title) {
                    completedSkills.push(a.scenarios.title);
                }
            });
        }

        // Fetch existing certifications
        const { data: certifications } = await supabase
            .from('employee_certifications')
            .select('certification_name')
            .eq('user_id', userId);

        const existingCerts: string[] = certifications?.map((c: any) => c.certification_name) || [];

        // Generate AI roadmap with retry logic (10 retries, 1.5s interval)
        console.log('[CareerGoals] Generating AI roadmap with retry logic...');
        const roadmap = await withRetry(
            () => generateCareerRoadmap(
                userData.job_title || 'Employee',
                goalTitle,
                userData.department || 'General',
                {
                    ...userData.skills_profile,
                    completedTrainings: completedSkills,
                    existingCertifications: existingCerts
                },
                [...new Set(weaknesses)].slice(0, 5) // Unique weaknesses, max 5
            ),
            'AI Roadmap Generation'
        );

        // Insert the career goal
        const { data: newGoal, error: insertError } = await supabase
            .from('employee_career_goals')
            .insert({
                user_id: userId,
                goal_title: goalTitle,
                goal_description: goalDescription || null,
                target_timeframe: targetTimeframe || '5 years',
                generated_roadmap: roadmap.roadmap,
                recommended_certifications: roadmap.certifications,
                recommended_assessments: roadmap.assessments,
                status: 'active'
            })
            .select()
            .single();

        if (insertError) {
            console.error('[CareerGoals] Error inserting goal:', insertError);
            res.status(500).json({ success: false, message: insertError.message });
            return;
        }

        console.log('[CareerGoals] Created goal:', newGoal.id);
        res.json({ success: true, data: newGoal });
    } catch (error: any) {
        console.error('[CareerGoals] Error creating goal:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update a career goal
export const updateCareerGoal = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { goalTitle, goalDescription, targetTimeframe, status } = req.body;

        console.log('[CareerGoals] Updating goal:', id);

        const updates: any = { updated_at: new Date().toISOString() };
        if (goalTitle) updates.goal_title = goalTitle;
        if (goalDescription !== undefined) updates.goal_description = goalDescription;
        if (targetTimeframe) updates.target_timeframe = targetTimeframe;
        if (status) updates.status = status;

        const { data, error } = await supabase
            .from('employee_career_goals')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[CareerGoals] Error updating goal:', error);
            res.status(500).json({ success: false, message: error.message });
            return;
        }

        res.json({ success: true, data });
    } catch (error: any) {
        console.error('[CareerGoals] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete a career goal
export const deleteCareerGoal = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        console.log('[CareerGoals] Deleting goal:', id);

        const { error } = await supabase
            .from('employee_career_goals')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[CareerGoals] Error deleting goal:', error);
            res.status(500).json({ success: false, message: error.message });
            return;
        }

        res.json({ success: true, message: 'Goal deleted' });
    } catch (error: any) {
        console.error('[CareerGoals] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get dynamic action items for Growth tab
export const getGrowthActionItems = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;

        console.log('[CareerGoals] Getting growth action items for user:', userId);

        // Fetch user data
        const { data: userData } = await supabase
            .from('employees')
            .select('job_title, department, total_points')
            .eq('id', userId)
            .single();

        // Get ELO from employee record
        const { data: eloData } = await supabase
            .from('employees')
            .select('elo_rating')
            .eq('id', userId)
            .single();

        const elo = eloData?.elo_rating || 1000;

        // Fetch user's assessment feedback
        const { data: feedbackData } = await supabase
            .from('pre_assessments')
            .select('personalized_feedback')
            .eq('user_id', userId)
            .not('personalized_feedback', 'is', null)
            .order('created_at', { ascending: false })
            .limit(3);

        // Fetch in-progress trainings
        const { data: inProgressData } = await supabase
            .from('pre_assessments')
            .select('scenario_id, scenarios(title)')
            .eq('user_id', userId)
            .eq('completed', true);

        // Fetch completed post-assessments
        const { data: completedData } = await supabase
            .from('assessments')
            .select('id')
            .eq('user_id', userId);

        // Fetch career goals
        const { data: goalsData } = await supabase
            .from('employee_career_goals')
            .select('goal_title, recommended_assessments')
            .eq('user_id', userId)
            .eq('status', 'active')
            .limit(1);

        // Build dynamic action items
        const actionItems: {
            goal: string[];
            reality: string[];
            options: string[];
            will: string[];
        } = {
            goal: [],
            reality: [],
            options: [],
            will: []
        };

        // GOAL section
        if (goalsData && goalsData.length > 0) {
            actionItems.goal.push(`Working towards: ${goalsData[0].goal_title}`);
            if (goalsData[0].recommended_assessments?.length > 0) {
                actionItems.goal.push(`Next: Complete ${goalsData[0].recommended_assessments[0]} assessment`);
            }
        } else {
            actionItems.goal.push('Set a career goal in the Career tab');
            actionItems.goal.push('Visualize your ideal role in 1-2 years');
        }

        // REALITY section
        actionItems.reality.push(`Your current ELO: ${elo}`);
        actionItems.reality.push(`Completed trainings: ${completedData?.length || 0}`);

        if (feedbackData && feedbackData.length > 0) {
            const weaknesses = feedbackData
                .filter((f: any) => f.personalized_feedback?.weaknesses?.length > 0)
                .flatMap((f: any) => f.personalized_feedback.weaknesses)
                .slice(0, 2);
            if (weaknesses.length > 0) {
                actionItems.reality.push(`Focus area: ${weaknesses[0]}`);
            }
        }

        // OPTIONS section
        actionItems.options.push('Browse available CTF challenges');
        if (userData?.department) {
            actionItems.options.push(`Explore ${userData.department} certifications`);
        }
        actionItems.options.push('Check the career path requirements');

        // WILL section
        if (inProgressData && inProgressData.length > 0) {
            const unfinished = inProgressData.length - (completedData?.length || 0);
            if (unfinished > 0) {
                actionItems.will.push(`Complete ${unfinished} in-progress training(s)`);
            }
        }
        actionItems.will.push('Start your next training today');
        actionItems.will.push('Set a weekly learning goal');

        res.json({ success: true, data: actionItems });
    } catch (error: any) {
        console.error('[CareerGoals] Error getting action items:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Generate an on-the-fly self-assessment based on skill/topic
export const generateSelfAssessment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId, topic, description } = req.body;

        console.log('[CareerGoals] Generating self-assessment for user:', userId, 'Topic:', topic);

        if (!userId || !topic) {
            res.status(400).json({ success: false, message: 'User ID and topic are required' });
            return;
        }

        // Check for existing scenario - don't use .single() as 0 results is valid
        const { data: existingScenarios, error: searchError } = await supabase
            .from('scenarios')
            .select('id, title')
            .ilike('title', `%${topic}%`)
            .limit(1);

        if (searchError) {
            console.error('[CareerGoals] Error searching scenarios:', searchError);
            throw searchError;
        }

        let scenarioId: string;

        if (existingScenarios && existingScenarios.length > 0) {
            // Found existing scenario
            console.log('[CareerGoals] Using existing scenario:', existingScenarios[0].id);
            scenarioId = existingScenarios[0].id;
        } else {
            // Create new scenario for this topic
            console.log('[CareerGoals] Creating new scenario for topic:', topic);
            const newScenario = await withRetry(
                async () => {
                    const { data, error } = await supabase
                        .from('scenarios')
                        .insert({
                            title: `Self-Assessment: ${topic}`,
                            scenario_text: description || `Auto-generated assessment for ${topic}`,
                            task: `Complete this self-assessment to evaluate your proficiency in ${topic}.`,
                            category: 'self-assessment',
                            skill: topic,
                            difficulty: 'Normal',
                            rubric: {
                                criteria: ['Understanding of core concepts', 'Practical application', 'Problem-solving ability'],
                                ideal_response_keywords: [topic.toLowerCase(), 'analysis', 'solution']
                            },
                            is_personalized: true,
                            status: 'published'
                        })
                        .select()
                        .single();
                    if (error) throw error;
                    return data;
                },
                'Create new scenario'
            );
            scenarioId = newScenario.id;
        }

        res.json({
            success: true,
            data: {
                scenarioId,
                message: `Assessment for "${topic}" is ready. You can now take it.`
            }
        });
    } catch (error: any) {
        console.error('[CareerGoals] Error generating self-assessment:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
