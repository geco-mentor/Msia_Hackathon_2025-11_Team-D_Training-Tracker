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

export const getMainChallenges = async () => {
    const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('is_personalized', false)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
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
                const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                const evaluation = JSON.parse(cleanText);

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

        return data;

    } catch (error) {
        console.error('Error evaluating response:', error);
        throw new Error('Failed to evaluate response');
    }
};
