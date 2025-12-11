import { Request, Response } from 'express';
import { supabase } from '../config/database';
import { generatePersonalizedQuestions, evaluatePreAssessmentAnswer } from '../services/awsService';
import { AuthRequest } from '../middleware/auth';

// Helper to retry database operations
const withRetry = async <T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        }
    }
    throw lastError;
};

export const generatePersonalizedAssessment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId, jobTitle, goalDescription, format, difficulty } = req.body;

        // Validation
        if (!userId || !jobTitle || !goalDescription || !format) {
            res.status(400).json({ success: false, message: 'Missing required fields' });
            return;
        }

        console.log(`[PersonalizedAssessment] Generating for ${userId}: ${format} - ${goalDescription}`);

        // 1. Generate Questions via AI
        // If 'topic' is provided (new frontend), use it. Otherwise fallback to goalDescription.
        const topic = req.body.topic || goalDescription;

        const aiData = await generatePersonalizedQuestions(
            jobTitle,
            topic, // Now passing topic/skill instead of just goal description
            format,
            difficulty || 'Normal'
        );

        // 2. Create Scenario Entry
        // We set is_personalized = true
        // We store the first question or generic text in scenario_text
        // Ensure all required fields have valid fallback values
        const safeTargetSkills = aiData.targetSkills && aiData.targetSkills.length > 0
            ? aiData.targetSkills
            : ['General'];
        const safeRubric = {
            criteria: ['Accuracy', 'Understanding', 'Application'],
            ideal_response_keywords: safeTargetSkills.map(s => s.toLowerCase())
        };

        const { data: scenario, error: scenarioError } = await supabase
            .from('scenarios')
            .insert({
                title: aiData.assessmentTitle || `Personalized Assessment: ${goalDescription.substring(0, 30)}...`,
                category: 'Personalized',
                skill: safeTargetSkills[0],
                difficulty: difficulty || 'Normal',
                scenario_text: `Personalized assessment for ${jobTitle} on topic: ${topic}`,
                task: `Complete this ${format === 'mcq' ? 'multiple choice' : 'text-based'} assessment.`,
                rubric: safeRubric,
                type: format === 'mcq' ? 'multiple_choice' : 'text',
                is_personalized: true,
                creator_id: userId,
                status: 'published'
            })
            .select()
            .single();

        if (scenarioError) throw scenarioError;

        // 3. Create Pre-Assessment Entry (Tracking)
        // We assume personalized assessments use the standardized "pre_assessments" table layout
        // where 'questions_asked' holds the question queue.
        const { data: tracking, error: trackingError } = await supabase
            .from('pre_assessments')
            .insert({
                user_id: userId,
                scenario_id: scenario.id,
                is_familiar: true, // Skip familiarity check for personalized
                questions_asked: aiData.questions, // Store ALL 5 questions here
                answers_given: [],
                current_difficulty: difficulty || 'Normal',
                completed: false
            })
            .select()
            .single();

        if (trackingError) throw trackingError;

        res.json({
            success: true,
            data: {
                scenarioId: scenario.id,
                trackingId: tracking.id,
                firstQuestion: aiData.questions[0],
                totalQuestions: aiData.questions.length
            }
        });

    } catch (error: any) {
        console.error('[PersonalizedAssessment] Generation error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const startPersonalizedAssessment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId, scenarioId } = req.body;

        // Fetch tracking info
        const { data: tracking, error } = await supabase
            .from('pre_assessments')
            .select('*')
            .eq('user_id', userId)
            .eq('scenario_id', scenarioId)
            .single();

        if (error || !tracking) {
            res.status(404).json({ success: false, message: 'Assessment not found' });
            return;
        }

        if (tracking.completed) {
            res.json({ success: true, completed: true, score: tracking.baseline_score });
            return;
        }

        const questions = tracking.questions_asked as any[];
        const answers = tracking.answers_given as any[];
        const nextIndex = answers.length;

        if (nextIndex >= questions.length) {
            // Should be completed
            res.json({ success: true, completed: true, score: tracking.baseline_score });
            return;
        }

        res.json({
            success: true,
            data: {
                question: questions[nextIndex],
                progress: {
                    current: nextIndex + 1,
                    total: questions.length
                }
            }
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const submitPersonalizedAnswer = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId, scenarioId, answer, skipped } = req.body;

        // Fetch tracking info
        const { data: tracking, error } = await supabase
            .from('pre_assessments')
            .select('*')
            .eq('user_id', userId)
            .eq('scenario_id', scenarioId)
            .single();

        if (error || !tracking) {
            res.status(404).json({ success: false, message: 'Assessment not found' });
            return;
        }

        const questions = tracking.questions_asked as any[];
        const answers = tracking.answers_given as any[];
        const currentIndex = answers.length;

        if (currentIndex >= questions.length) {
            res.status(400).json({ success: false, message: 'Assessment already completed' });
            return;
        }

        const currentQuestion = questions[currentIndex];
        let score = 0;
        let feedback = '';

        // Use explicit skipped flag
        const isDontKnow = skipped === true;

        // Evaluation
        if (currentQuestion.type === 'multiple_choice') {
            const isCorrect = !isDontKnow && (answer.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase()
                || answer.trim().startsWith(currentQuestion.correctAnswer.trim()));

            score = isCorrect ? 100 : 0;
            // Enhanced feedback
            if (isCorrect) {
                feedback = 'Correct!';
            } else if (isDontKnow) {
                feedback = `No problem! The correct answer is: ${currentQuestion.correctAnswer}.`;
                // You might want to add more explanation here if available in the question object
            } else {
                feedback = `Incorrect. The correct answer was: ${currentQuestion.correctAnswer}`;
            }
        } else {
            // Text evaluation via AI
            if (isDontKnow) {
                score = 0;
                const correctRef = currentQuestion.correctAnswer || currentQuestion.rubric_reference;
                if (correctRef) {
                    feedback = `No problem! A good answer would be: ${correctRef}`;
                } else {
                    feedback = `That's okay. A good answer would demonstrate mastery of: ${currentQuestion.skill}`;
                }
            } else {
                const aiEval = await evaluatePreAssessmentAnswer(
                    currentQuestion.question,
                    answer,
                    `Skill context: ${currentQuestion.skill} for personalized assessment.`,
                    currentIndex + 1
                );
                score = aiEval.score;
                feedback = aiEval.feedback;
            }
        }

        // Save Answer
        const newAnswers = [...answers, {
            question: currentQuestion.question,
            answer: answer,
            score: score,
            feedback: feedback
        }];

        // Check completion
        const isComplete = newAnswers.length >= questions.length;
        let finalScore = 0;

        if (isComplete) {
            const totalScore = newAnswers.reduce((sum, a) => sum + a.score, 0);
            finalScore = Math.round(totalScore / questions.length);

            // Update user profile (ELO, Skills)
            const { data: user } = await supabase
                .from('employees')
                .select('skills_profile, elo_rating, total_points')
                .eq('id', userId)
                .single();

            if (user) {
                // ELO Calculation (Updated: always positive but low for failures)
                // Old: Math.round((finalScore - 50) / 2); (+25 to -25)
                // New: Base +2, plus up to 20 based on score.
                // 0 score -> +2 ELO
                // 100 score -> +22 ELO
                const eloChange = Math.round(finalScore * 0.2) + 2;
                const newElo = (user.elo_rating || 1000) + eloChange;

                // Skills Update
                const newSkills = { ...user.skills_profile };
                const skillName = currentQuestion.skill || 'General';
                const currentSkillScore = newSkills[skillName] || 0.5;
                const normalizedScore = finalScore / 100;
                newSkills[skillName] = Number(((currentSkillScore * 0.9) + (normalizedScore * 0.1)).toFixed(2));

                await supabase.from('employees').update({
                    elo_rating: newElo,
                    skills_profile: newSkills,
                    total_points: (user.total_points || 0) + (finalScore > 70 ? 100 : 10)
                }).eq('id', userId);
            }
        }

        // Update Tracking
        await supabase
            .from('pre_assessments')
            .update({
                answers_given: newAnswers,
                completed: isComplete,
                baseline_score: isComplete ? finalScore : 0
            })
            .eq('id', tracking.id);

        res.json({
            success: true,
            data: {
                correct: score > 70,
                feedback: feedback,
                scoreObtained: score,
                completed: isComplete,
                finalScore: isComplete ? finalScore : undefined,
                nextQuestion: isComplete ? undefined : questions[currentIndex + 1]
            }
        });

    } catch (error: any) {
        console.error('[PersonalizedAssessment] Submit error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
