import { Request, Response } from 'express';
import { supabase } from '../config/database';
import {
    generateAdaptiveQuestion,
    generatePostAssessmentQuestions,
    evaluateAssessment,
    generatePreAssessmentQuestion,
    evaluatePreAssessmentAnswer,
    readTextFile,
    generateMicroScenario,
    evaluateWithRubrics,
    generatePersonalizedFeedback,
    generateSelfAssessmentPlan
} from '../services/awsService';

// ============================================
// PRE-ASSESSMENT FLOW (New Implementation)
// ============================================

/**
 * Start a new pre-assessment for a user and scenario.
 * Returns the familiarity question.
 */
export const startPreAssessment = async (req: Request, res: Response) => {
    try {
        const { scenarioId, userId } = req.body;
        console.log('DEBUG: startPreAssessment called with:', { scenarioId, userId });

        if (!scenarioId || !userId) {
            return res.status(400).json({ message: 'Missing required fields: scenarioId, userId' });
        }

        // Check if pre-assessment already exists
        const { data: existing } = await supabase
            .from('pre_assessments')
            .select('*')
            .eq('user_id', userId)
            .eq('scenario_id', scenarioId)
            .single();

        if (existing) {
            if (existing.completed) {
                return res.json({
                    preAssessmentId: existing.id,
                    completed: true,
                    baselineScore: existing.baseline_score,
                    message: 'Pre-assessment already completed'
                });
            }

            // Resume existing pre-assessment
            const questionsAsked = existing.questions_asked || [];
            const answersGiven = existing.answers_given || [];

            // Determine current step based on state
            let currentStep: string;
            let currentQuestion: string | null = null;

            if (existing.is_familiar === null || existing.is_familiar === undefined) {
                // Never answered familiarity question
                currentStep = 'familiarity';
            } else if (existing.is_familiar === false) {
                // Already said "not familiar" - should be completed
                currentStep = 'complete';
            } else if (questionsAsked.length === 0) {
                // Familiar but no questions yet - need to generate first question
                // For now, return familiarity step to restart
                currentStep = 'familiarity';
                // Reset the is_familiar to null so they can restart
                await supabase
                    .from('pre_assessments')
                    .update({ is_familiar: null })
                    .eq('id', existing.id);
            } else if (questionsAsked.length > answersGiven.length) {
                // There's an unanswered question
                currentStep = 'questions';
                currentQuestion = questionsAsked[questionsAsked.length - 1];
            } else {
                // All questions answered, might need more or be complete
                currentStep = 'questions';
                currentQuestion = questionsAsked[questionsAsked.length - 1];
            }

            return res.json({
                preAssessmentId: existing.id,
                completed: false,
                isFamiliar: existing.is_familiar,
                questionsAsked: questionsAsked,
                answersGiven: answersGiven,
                currentStep: currentStep,
                currentQuestion: currentQuestion,
                message: 'Resuming pre-assessment'
            });
        }

        // Get scenario info for context
        const { data: scenario, error: scenarioError } = await supabase
            .from('scenarios')
            .select('title, category, skill')
            .eq('id', scenarioId)
            .single();

        if (scenarioError || !scenario) {
            return res.status(404).json({ message: 'Scenario not found' });
        }

        // Create new pre-assessment record
        const { data: preAssessment, error } = await supabase
            .from('pre_assessments')
            .insert({
                user_id: userId,
                scenario_id: scenarioId,
                is_familiar: null,
                questions_asked: [],
                answers_given: [],
                baseline_score: 0,
                completed: false
            })
            .select()
            .single();

        if (error) {
            console.error('DEBUG: Error creating pre-assessment:', error);
            throw error;
        }

        console.log('DEBUG: Created pre-assessment:', preAssessment.id);

        // Return familiarity question
        const topicName = scenario.title || scenario.skill || scenario.category || 'this topic';

        res.json({
            preAssessmentId: preAssessment.id,
            completed: false,
            currentStep: 'familiarity',
            familiarityQuestion: `Are you familiar with ${topicName}?`,
            topicName: topicName
        });

    } catch (error: any) {
        console.error('Error starting pre-assessment:', error);
        res.status(500).json({ message: 'Failed to start pre-assessment', error: error.message });
    }
};

/**
 * Submit the familiarity answer (Yes/No).
 * If No: Complete with baseline 0
 * If Yes: Generate and return first follow-up question
 */
export const submitFamiliarity = async (req: Request, res: Response) => {
    try {
        const { preAssessmentId, isFamiliar } = req.body;
        console.log('DEBUG: submitFamiliarity called with:', { preAssessmentId, isFamiliar });

        if (!preAssessmentId || isFamiliar === undefined) {
            return res.status(400).json({ message: 'Missing required fields: preAssessmentId, isFamiliar' });
        }

        // Get pre-assessment data
        const { data: preAssessment, error } = await supabase
            .from('pre_assessments')
            .select('*, scenarios(*)')
            .eq('id', preAssessmentId)
            .single();

        if (error || !preAssessment) {
            console.error('DEBUG: Pre-assessment query error:', error);
            return res.status(404).json({ message: 'Pre-assessment not found' });
        }

        // Update familiarity status
        await supabase
            .from('pre_assessments')
            .update({ is_familiar: isFamiliar })
            .eq('id', preAssessmentId);

        // If NOT familiar, complete immediately with baseline 0
        if (!isFamiliar) {
            console.log('DEBUG: User not familiar, completing with baseline 0');
            await supabase
                .from('pre_assessments')
                .update({
                    completed: true,
                    baseline_score: 0,
                    completed_at: new Date().toISOString()
                })
                .eq('id', preAssessmentId);

            return res.json({
                completed: true,
                baselineScore: 0,
                message: 'Pre-assessment complete. Starting from beginner level.'
            });
        }

        // If familiar, get context and generate first question
        console.log('DEBUG: User is familiar, generating first question...');

        // Get employee data separately
        const { data: employee } = await supabase
            .from('employees')
            .select('job_description, job_title')
            .eq('id', preAssessment.user_id)
            .single();

        const jobDescription = employee?.job_description ||
            employee?.job_title ||
            'General employee';

        // Get topic context from S3 - NO FALLBACKS, must have curriculum content
        let topicContext = '';
        const scenario = preAssessment.scenarios;

        console.log('DEBUG: Scenario data:', JSON.stringify({
            id: scenario?.id,
            title: scenario?.title,
            extractedTextFile: scenario?.extracted_text_file
        }));

        // REQUIRE extracted_text_file - this is the curriculum content
        if (!scenario?.extracted_text_file) {
            console.error('ERROR: Scenario has no extracted_text_file - curriculum not uploaded properly');
            return res.status(400).json({
                message: 'This challenge does not have curriculum content. Please ask admin to re-upload the training material.',
                error: 'NO_CURRICULUM_CONTENT'
            });
        }

        const bucket = process.env.AWS_S3_BUCKET_NAME;
        if (!bucket) {
            console.error('ERROR: AWS_S3_BUCKET_NAME not configured');
            return res.status(500).json({ message: 'Server configuration error: S3 bucket not set' });
        }

        console.log('DEBUG: Reading S3 file:', bucket, scenario.extracted_text_file);
        topicContext = await readTextFile(bucket, scenario.extracted_text_file);
        console.log('DEBUG: Loaded topic context from S3, length:', topicContext.length);

        if (!topicContext || topicContext.length < 100) {
            console.error('ERROR: Extracted text is too short:', topicContext.length);
            return res.status(400).json({
                message: 'Curriculum content is empty or too short. Please ask admin to re-upload the training material.',
                error: 'CURRICULUM_CONTENT_TOO_SHORT'
            });
        }

        // Get rubrics from scenario if available
        const rubrics = scenario?.rubric || { generic: [], department: [], module: [] };

        // Generate first micro-scenario (Easy difficulty for pre-assessment start)
        const microScenario = await generateMicroScenario(
            topicContext,
            jobDescription,
            'Easy',  // Start with Easy for pre-assessment
            rubrics,
            []  // No history for first question
        );

        // Save the scenario data
        await supabase
            .from('pre_assessments')
            .update({
                questions_asked: [microScenario],
                current_difficulty: 'Easy'
            })
            .eq('id', preAssessmentId);

        res.json({
            completed: false,
            currentStep: 'questions',
            questionNumber: 1,
            totalQuestions: '1-4',
            scenario: microScenario.scenario,
            question: microScenario.question,
            type: microScenario.type,

            hint: microScenario.hint,
            difficulty: 'Easy'
        });

    } catch (error: any) {
        console.error('Error submitting familiarity:', error);
        res.status(500).json({ message: 'Failed to submit familiarity', error: error.message });
    }
};

/**
 * Submit an answer to a pre-assessment question.
 * Evaluates the answer and either generates next question or completes the assessment.
 */
export const submitPreAssessmentAnswer = async (req: Request, res: Response) => {
    try {
        const { preAssessmentId, answer } = req.body;
        console.log('DEBUG: submitPreAssessmentAnswer called');

        if (!preAssessmentId || !answer) {
            return res.status(400).json({ message: 'Missing required fields: preAssessmentId, answer' });
        }

        // Get pre-assessment data
        const { data: preAssessment, error } = await supabase
            .from('pre_assessments')
            .select('*, scenarios(*)')
            .eq('id', preAssessmentId)
            .single();

        if (error || !preAssessment) {
            console.error('DEBUG: Pre-assessment query error:', error);
            return res.status(404).json({ message: 'Pre-assessment not found' });
        }

        const questionsAsked = preAssessment.questions_asked || [];
        const answersGiven = preAssessment.answers_given || [];
        const currentQuestionCount = questionsAsked.length;
        const lastScenario = questionsAsked[questionsAsked.length - 1];
        const currentDifficulty: 'Easy' | 'Normal' | 'Hard' = preAssessment.current_difficulty || 'Easy';

        // Get topic context from S3 - NO FALLBACKS
        const scenario = preAssessment.scenarios;
        const bucket = process.env.AWS_S3_BUCKET_NAME;

        if (!bucket || !scenario?.extracted_text_file) {
            return res.status(400).json({
                message: 'Missing curriculum content configuration',
                error: 'NO_CURRICULUM_CONTENT'
            });
        }

        const topicContext = await readTextFile(bucket, scenario.extracted_text_file);
        const rubrics = scenario?.rubric || { generic: [], department: [], module: [] };

        // Evaluate the answer using rubrics
        const evaluation = await evaluateWithRubrics(
            lastScenario.scenario || '',
            lastScenario.question,
            answer,
            lastScenario.correctAnswer,
            rubrics,
            topicContext,
            lastScenario.type || 'text'
        );

        // Save the answer with evaluation
        const answerRecord = {
            scenario: lastScenario.scenario,
            question: lastScenario.question,
            answer,
            score: evaluation.score,
            isCorrect: evaluation.isCorrect,
            feedback: evaluation.feedback
        };
        const newAnswers = [...answersGiven, answerRecord];

        // Determine if we need more questions (adaptive logic)
        const avgScore = newAnswers.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / newAnswers.length;
        const needsMoreQuestions = currentQuestionCount < 4 && (
            (avgScore >= 30 && avgScore <= 80) ||  // Unclear baseline
            currentQuestionCount < 2  // Minimum 2 questions
        );

        // Calculate next difficulty (adaptive)
        let nextDifficulty: 'Easy' | 'Normal' | 'Hard' = currentDifficulty;
        if (evaluation.isCorrect && evaluation.score >= 70) {
            nextDifficulty = currentDifficulty === 'Easy' ? 'Normal' : 'Hard';
        } else if (!evaluation.isCorrect || evaluation.score < 40) {
            nextDifficulty = currentDifficulty === 'Hard' ? 'Normal' : 'Easy';
        }

        await supabase
            .from('pre_assessments')
            .update({
                answers_given: newAnswers,
                current_difficulty: nextDifficulty
            })
            .eq('id', preAssessmentId);

        // Check if we need more questions
        if (needsMoreQuestions) {
            console.log('DEBUG: Generating next micro-scenario, difficulty:', nextDifficulty);

            // Get employee data
            const { data: employee } = await supabase
                .from('employees')
                .select('job_description, job_title')
                .eq('id', preAssessment.user_id)
                .single();

            const jobDescription = employee?.job_description || employee?.job_title || 'General employee';

            // Build history for context
            const history = newAnswers.map((a: any) => ({
                scenario: a.scenario || '',
                question: a.question,
                answer: a.answer
            }));

            // Generate next micro-scenario with adaptive difficulty
            const nextScenario = await generateMicroScenario(
                topicContext,
                jobDescription,
                nextDifficulty,
                rubrics,
                history
            );

            // Save the new scenario
            await supabase
                .from('pre_assessments')
                .update({ questions_asked: [...questionsAsked, nextScenario] })
                .eq('id', preAssessmentId);

            return res.json({
                completed: false,
                currentStep: 'questions',
                questionNumber: currentQuestionCount + 1,
                totalQuestions: '1-4',
                scenario: nextScenario.scenario,
                question: nextScenario.question,
                type: nextScenario.type,

                hint: nextScenario.hint,
                difficulty: nextDifficulty,
                previousFeedback: evaluation.feedback,
                previousScore: evaluation.score
            });
        }

        // Calculate final baseline score
        const baselineScore = Math.round(avgScore);
        console.log('DEBUG: Pre-assessment complete, baseline score:', baselineScore);

        // Get employee data for personalized feedback
        const { data: employee } = await supabase
            .from('employees')
            .select('job_description, job_title')
            .eq('id', preAssessment.user_id)
            .single();

        const jobDescription = employee?.job_description || employee?.job_title || 'General employee';

        // Generate personalized feedback
        const feedback = await generatePersonalizedFeedback(
            jobDescription,
            newAnswers,
            rubrics,
            baselineScore
        );

        // Complete the pre-assessment
        await supabase
            .from('pre_assessments')
            .update({
                completed: true,
                baseline_score: baselineScore,
                completed_at: new Date().toISOString(),
                personalized_feedback: feedback
            })
            .eq('id', preAssessmentId);

        res.json({
            completed: true,
            baselineScore: baselineScore,
            questionsAnswered: currentQuestionCount,
            lastFeedback: evaluation.feedback,
            personalizedFeedback: feedback,
            message: `Pre-assessment complete! Your baseline score is ${baselineScore}%.`
        });

    } catch (error: any) {
        console.error('Error submitting pre-assessment answer:', error);
        res.status(500).json({ message: 'Failed to submit answer', error: error.message });
    }
};

/**
 * Check if a user has completed pre-assessment for a scenario.
 */
export const checkPreAssessmentStatus = async (req: Request, res: Response) => {
    try {
        const { userId, scenarioId } = req.params;
        console.log('DEBUG: checkPreAssessmentStatus for user:', userId, 'scenario:', scenarioId);

        const { data, error } = await supabase
            .from('pre_assessments')
            .select('*')
            .eq('user_id', userId)
            .eq('scenario_id', scenarioId)
            .single();

        if (error || !data) {
            return res.json({
                exists: false,
                completed: false,
                canAccessPostAssessment: false
            });
        }

        res.json({
            exists: true,
            preAssessmentId: data.id,
            completed: data.completed,
            baselineScore: data.baseline_score,
            canAccessPostAssessment: data.completed
        });

    } catch (error: any) {
        console.error('Error checking pre-assessment status:', error);
        res.status(500).json({ message: 'Failed to check status', error: error.message });
    }
};

export const checkPostAssessmentStatus = async (req: Request, res: Response) => {
    try {
        const { userId, scenarioId } = req.params;
        console.log('DEBUG: checkPostAssessmentStatus for user:', userId, 'scenario:', scenarioId);

        const { data, error } = await supabase
            .from('assessments')
            .select('*')
            .eq('user_id', userId)
            .eq('scenario_id', scenarioId)
            .eq('completed', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) {
            return res.json({
                exists: false,
                completed: false
            });
        }

        res.json({
            exists: true,
            assessmentId: data.id,
            completed: true,
            score: data.score
        });

    } catch (error: any) {
        console.error('Error checking post-assessment status:', error);
        res.status(500).json({ message: 'Failed to check status', error: error.message });
    }
};

// ============================================
// POST-ASSESSMENT FLOW (New Implementation)
// ============================================

/**
 * Start a post-assessment for a user and scenario.
 * Requires pre-assessment to be completed.
 * Starts with difficulty based on pre-assessment baseline score.
 */
export const startPostAssessment = async (req: Request, res: Response) => {
    try {
        const { scenarioId, userId } = req.body;
        console.log('DEBUG: startPostAssessment for user:', userId, 'scenario:', scenarioId);

        if (!scenarioId || !userId) {
            return res.status(400).json({ message: 'Missing required fields: scenarioId, userId' });
        }

        // Check pre-assessment is completed
        const { data: preAssessment } = await supabase
            .from('pre_assessments')
            .select('completed, baseline_score')
            .eq('user_id', userId)
            .eq('scenario_id', scenarioId)
            .single();

        if (!preAssessment || !preAssessment.completed) {
            return res.status(403).json({
                message: 'Pre-assessment must be completed before starting post-assessment',
                preAssessmentRequired: true
            });
        }

        // Check if post-assessment already exists
        const { data: existing } = await supabase
            .from('assessments')
            .select('*')
            .eq('user_id', userId)
            .eq('scenario_id', scenarioId)
            .single();

        if (existing && existing.completed) {
            return res.json({
                completed: true,
                score: existing.score,
                message: 'Post-assessment already completed'
            });
        }



        // Get scenario and curriculum
        const { data: scenario, error: scenarioError } = await supabase
            .from('scenarios')
            .select('*, extracted_text_file')
            .eq('id', scenarioId)
            .single();

        if (scenarioError || !scenario) {
            return res.status(404).json({ message: 'Scenario not found' });
        }

        const bucket = process.env.AWS_S3_BUCKET_NAME;
        if (!bucket || !scenario.extracted_text_file) {
            return res.status(400).json({
                message: 'Scenario missing curriculum content',
                error: 'NO_CURRICULUM_CONTENT'
            });
        }

        const topicContext = await readTextFile(bucket, scenario.extracted_text_file);
        const rubrics = scenario.rubric || { generic: [], department: [], module: [] };

        // Determine starting difficulty
        // If personalized, use the chosen difficulty. Otherwise use adaptive baseline.
        const baselineScore = preAssessment.baseline_score || 0;
        let startDifficulty: 'Easy' | 'Normal' | 'Hard' = 'Normal';

        if (scenario.is_personalized && scenario.difficulty) {
            startDifficulty = scenario.difficulty as 'Easy' | 'Normal' | 'Hard';
        } else {
            if (baselineScore < 40) startDifficulty = 'Easy';
            else if (baselineScore > 70) startDifficulty = 'Hard';
        }

        // Get employee data
        const { data: employee } = await supabase
            .from('employees')
            .select('job_description, job_title')
            .eq('id', userId)
            .single();

        const jobDescription = employee?.job_description || employee?.job_title || 'General employee';

        // Generate first micro-scenario
        const firstScenario = await generateMicroScenario(
            topicContext,
            jobDescription,
            startDifficulty,
            rubrics,
            []
        );

        // Create or update assessment record
        const assessmentData = {
            user_id: userId,
            scenario_id: scenarioId,
            questions_asked: [firstScenario],
            answers_given: [],
            current_difficulty: startDifficulty,
            current_question: 1,
            total_questions: 7,
            score: 0,
            completed: false,
            // Required fields from original schema
            user_response: JSON.stringify([]),  // Will be populated as answers come in
            feedback: '',  // Will be populated at completion
            difficulty: startDifficulty  // Legacy field
        };

        let assessmentId: string;
        if (existing) {
            await supabase
                .from('assessments')
                .update(assessmentData)
                .eq('id', existing.id);
            assessmentId = existing.id;
        } else {
            const { data: created, error: createError } = await supabase
                .from('assessments')
                .insert(assessmentData)
                .select()
                .single();

            if (createError) throw createError;
            assessmentId = created.id;
        }

        res.json({
            assessmentId,
            completed: false,
            currentStep: 'questions',
            questionNumber: 1,
            totalQuestions: 7,
            scenario: firstScenario.scenario,
            question: firstScenario.question,
            type: firstScenario.type,
            options: firstScenario.options,

            hint: firstScenario.hint,
            difficulty: startDifficulty,
            baselineScore: baselineScore
        });

    } catch (error: any) {
        console.error('Error starting post-assessment:', error);
        res.status(500).json({ message: 'Failed to start post-assessment', error: error.message });
    }
};

/**
 * Submit an answer for the post-assessment.
 * Uses adaptive difficulty and evaluates with rubrics.
 */
export const submitPostAssessmentAnswer = async (req: Request, res: Response) => {
    try {
        const { assessmentId, answer } = req.body;
        console.log('DEBUG: submitPostAssessmentAnswer for assessment:', assessmentId);

        if (!assessmentId || !answer) {
            return res.status(400).json({ message: 'Missing required fields: assessmentId, answer' });
        }

        // Get assessment data with scenario
        const { data: assessment, error } = await supabase
            .from('assessments')
            .select('*, scenarios(*)')
            .eq('id', assessmentId)
            .single();

        if (error || !assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        const questionsAsked = assessment.questions_asked || [];
        const answersGiven = assessment.answers_given || [];
        const currentQuestion = assessment.current_question || 1;
        const totalQuestions = assessment.total_questions || 7;
        const lastScenario = questionsAsked[questionsAsked.length - 1];
        const currentDifficulty: 'Easy' | 'Normal' | 'Hard' = assessment.current_difficulty || 'Normal';

        // Get curriculum from S3
        const scenario = assessment.scenarios;
        const bucket = process.env.AWS_S3_BUCKET_NAME;

        if (!bucket || !scenario?.extracted_text_file) {
            return res.status(400).json({ message: 'Missing curriculum content' });
        }

        const topicContext = await readTextFile(bucket, scenario.extracted_text_file);
        const rubrics = scenario.rubric || { generic: [], department: [], module: [] };

        // Evaluate the answer
        const evaluation = await evaluateWithRubrics(
            lastScenario.scenario || '',
            lastScenario.question,
            answer,
            lastScenario.correctAnswer,
            rubrics,
            topicContext,
            lastScenario.type || 'text'
        );

        // Save answer
        const answerRecord = {
            scenario: lastScenario.scenario,
            question: lastScenario.question,
            answer,
            score: evaluation.score,
            isCorrect: evaluation.isCorrect,
            feedback: evaluation.feedback
        };
        const newAnswers = [...answersGiven, answerRecord];

        // Calculate running average
        const avgScore = newAnswers.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / newAnswers.length;

        // Adaptive difficulty
        let nextDifficulty: 'Easy' | 'Normal' | 'Hard' = currentDifficulty;
        if (evaluation.isCorrect && evaluation.score >= 70) {
            nextDifficulty = currentDifficulty === 'Easy' ? 'Normal' : 'Hard';
        } else if (!evaluation.isCorrect || evaluation.score < 40) {
            nextDifficulty = currentDifficulty === 'Hard' ? 'Normal' : 'Easy';
        }

        // Check if more questions needed
        if (currentQuestion < totalQuestions) {
            // Get employee data
            const { data: employee } = await supabase
                .from('employees')
                .select('job_description, job_title')
                .eq('id', assessment.user_id)
                .single();

            const jobDescription = employee?.job_description || employee?.job_title || 'General employee';

            // Build history
            const history = newAnswers.map((a: any) => ({
                scenario: a.scenario || '',
                question: a.question,
                answer: a.answer
            }));

            // Generate next scenario
            const nextScenario = await generateMicroScenario(
                topicContext,
                jobDescription,
                nextDifficulty,
                rubrics,
                history
            );

            // Update assessment
            await supabase
                .from('assessments')
                .update({
                    questions_asked: [...questionsAsked, nextScenario],
                    answers_given: newAnswers,
                    current_difficulty: nextDifficulty,
                    current_question: currentQuestion + 1
                })
                .eq('id', assessmentId);

            return res.json({
                completed: false,
                currentStep: 'questions',
                questionNumber: currentQuestion + 1,
                totalQuestions,
                scenario: nextScenario.scenario,
                question: nextScenario.question,
                type: nextScenario.type,
                options: nextScenario.options,

                hint: nextScenario.hint,
                difficulty: nextDifficulty,
                previousFeedback: evaluation.feedback,
                previousScore: evaluation.score,
                runningScore: Math.round(avgScore)
            });
        }

        // Assessment complete
        const finalScore = Math.round(avgScore);

        // Get employee for personalized feedback
        const { data: employee } = await supabase
            .from('employees')
            .select('job_description, job_title')
            .eq('id', assessment.user_id)
            .single();

        const jobDescription = employee?.job_description || employee?.job_title || 'General employee';

        // Generate personalized feedback
        const personalizedFeedback = await generatePersonalizedFeedback(
            jobDescription,
            newAnswers,
            rubrics,
            finalScore
        );

        // Complete assessment
        await supabase
            .from('assessments')
            .update({
                answers_given: newAnswers,
                score: finalScore,
                feedback: JSON.stringify(personalizedFeedback),
                completed: true,
                completed_at: new Date().toISOString()
            })
            .eq('id', assessmentId);

        // Update employee stats if applicable
        // (Could add ELO update here)

        res.json({
            completed: true,
            score: finalScore,
            questionsAnswered: totalQuestions,
            lastFeedback: evaluation.feedback,
            personalizedFeedback
        });

    } catch (error: any) {
        console.error('Error submitting post-assessment answer:', error);
        res.status(500).json({ message: 'Failed to submit answer', error: error.message });
    }
}

// --- Pre-Assessment (Adaptive) - Legacy ---
export const handlePreAssessment = async (req: Request, res: Response) => {
    try {
        const { scenarioId, rating, history } = req.body;

        if (!scenarioId || rating === undefined) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        if (rating === 1) {
            return res.json({
                message: 'Pre-assessment complete (Beginner level)',
                complete: true,
                nextQuestion: null
            });
        }

        if (history && history.length >= 5) {
            return res.json({
                message: 'Pre-assessment complete',
                complete: true,
                nextQuestion: null
            });
        }

        const { data: scenario, error } = await supabase
            .from('scenarios')
            .select('scenario_text, source_file')
            .eq('id', scenarioId)
            .single();

        if (error || !scenario) {
            return res.status(404).json({ message: 'Scenario not found' });
        }

        const nextQuestion = await generateAdaptiveQuestion(scenario.scenario_text, history || []);

        res.json({
            complete: false,
            nextQuestion
        });

    } catch (error: any) {
        console.error('Error in pre-assessment:', error);
        res.status(500).json({ message: 'Failed to process pre-assessment', error: error.message });
    }
};

// --- Post-Assessment (Get Questions) ---
export const getPostAssessment = async (req: Request, res: Response) => {
    try {
        const { scenarioId } = req.params;
        const userId = req.query.userId as string;

        // Check if pre-assessment is completed (if userId provided)
        if (userId) {
            const { data: preAssessment } = await supabase
                .from('pre_assessments')
                .select('completed')
                .eq('user_id', userId)
                .eq('scenario_id', scenarioId)
                .single();

            if (!preAssessment || !preAssessment.completed) {
                return res.status(403).json({
                    message: 'Pre-assessment must be completed before accessing post-assessment',
                    preAssessmentRequired: true
                });
            }
        }

        const { data: scenario, error } = await supabase
            .from('scenarios')
            .select('post_assessment_data, scenario_text')
            .eq('id', scenarioId)
            .single();

        if (error || !scenario) {
            return res.status(404).json({ message: 'Scenario not found' });
        }

        if (scenario.post_assessment_data) {
            return res.json({ questions: scenario.post_assessment_data });
        }

        const questions = await generatePostAssessmentQuestions(scenario.scenario_text);

        await supabase
            .from('scenarios')
            .update({ post_assessment_data: questions })
            .eq('id', scenarioId);

        res.json({ questions });

    } catch (error: any) {
        console.error('Error getting post-assessment:', error);
        res.status(500).json({ message: 'Failed to get post-assessment', error: error.message });
    }
};

// --- Submit Assessment (Evaluate) ---
export const submitAssessment = async (req: Request, res: Response) => {
    try {
        const { userId, scenarioId, answers, type } = req.body;

        if (!userId || !scenarioId || !answers) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const { data: scenario, error } = await supabase
            .from('scenarios')
            .select('rubric, difficulty')
            .eq('id', scenarioId)
            .single();

        if (error || !scenario) {
            return res.status(404).json({ message: 'Scenario not found' });
        }

        const evaluation = await evaluateAssessment(answers, scenario.rubric);

        const { data: assessment, error: saveError } = await supabase
            .from('assessments')
            .insert({
                user_id: userId,
                scenario_id: scenarioId,
                score: evaluation.total_score,
                feedback: JSON.stringify(evaluation.feedback),
                user_response: JSON.stringify(answers),
                difficulty: scenario.difficulty
            })
            .select()
            .single();

        if (saveError) {
            throw saveError;
        }

        res.json({
            score: evaluation.total_score,
            feedback: evaluation.feedback,
            breakdown: evaluation.scores
        });

    } catch (error: any) {
        console.error('Error submitting assessment:', error);
        res.status(500).json({ message: 'Failed to submit assessment', error: error.message });
    }
};

// ============================================
// SELF-ASSESSMENT - Improvement Plan Generation
// ============================================

/**
 * Generate a personalized improvement plan for a specific weakness.
 * POST /api/assessments/self-assessment/generate
 */
export const generateSelfAssessment = async (req: Request, res: Response) => {
    try {
        const { userId, weakness } = req.body;
        console.log('DEBUG: generateSelfAssessment called with:', { userId, weakness });

        if (!userId || !weakness) {
            return res.status(400).json({ message: 'Missing required fields: userId, weakness' });
        }

        // Get employee data for context
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('job_title, job_description, department')
            .eq('id', userId)
            .single();

        if (empError || !employee) {
            console.error('DEBUG: Error fetching employee:', empError);
            return res.status(404).json({ message: 'Employee not found' });
        }

        const jobDescription = employee.job_description || employee.job_title || 'General employee';
        const additionalContext = `Department: ${employee.department || 'General'}`;

        // Generate the improvement plan using AI
        const plan = await generateSelfAssessmentPlan(weakness, jobDescription, additionalContext);

        console.log('DEBUG: Self-assessment plan generated successfully');
        res.json({
            success: true,
            plan
        });

    } catch (error: any) {
        console.error('Error generating self-assessment:', error);
        res.status(500).json({ message: 'Failed to generate self-assessment', error: error.message });
    }
};
