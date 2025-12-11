import { model } from './aiService';
import { supabase } from '../config/database';

export const generateGoals = async (keyword: string, userId: string) => {
    const prompt = `
        Generate 3 actionable, specific learning goals/tasks for a user interested in "${keyword}".
        The goals should be concise and achievable.
        
        Return ONLY a valid JSON array of objects:
        [
            { "description": "Goal 1 description" },
            { "description": "Goal 2 description" },
            { "description": "Goal 3 description" }
        ]
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const goalsData = JSON.parse(text);

        // Prepare data for insertion
        const goalsToInsert = goalsData.map((g: any) => ({
            user_id: userId,
            description: g.description,
            completed: false
        }));

        // Save to database
        const { data, error } = await supabase
            .from('goals')
            .insert(goalsToInsert)
            .select();

        if (error) throw error;
        return data;

    } catch (error) {
        console.error('Error generating goals:', error);
        throw new Error('Failed to generate goals');
    }
};

export const getUserGoals = async (userId: string) => {
    const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

export const updateGoalStatus = async (goalId: string, completed: boolean) => {
    const { data, error } = await supabase
        .from('goals')
        .update({ completed })
        .eq('id', goalId)
        .select()
        .single();

    if (error) throw error;
    return data;
};
