
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const populateHistory = async () => {
    console.log('Starting assessment history population for synthetic data...');

    // 1. Get Scenarios (we need IDs to link assessments)
    const { data: scenarios, error: scenarioError } = await supabase
        .from('scenarios')
        .select('id, title, skill, difficulty');

    if (scenarioError || !scenarios || scenarios.length === 0) {
        console.error('Error fetching scenarios or no scenarios found:', scenarioError);
        return;
    }
    console.log(`Found ${scenarios.length} scenarios.`);

    // 2. Identify Target Employees (Same logic as populate_prediction_data.ts)
    // We need to find the specific ones we modified or just find candidates again.
    // Ideally we match the ones that have weird win rates.

    // Find "At Risk" (Win Rate ~0.35)
    const { data: atRiskEmployees } = await supabase
        .from('employees')
        .select('id, name')
        .eq('department', 'Engineering')
        .lt('win_rate', 0.40)
        .gt('win_rate', 0.30);

    // Find "Accelerating" (Win Rate ~0.88)
    const { data: acceleratingEmployees } = await supabase
        .from('employees')
        .select('id, name')
        .eq('department', 'Engineering')
        .gt('win_rate', 0.80);

    console.log(`Targets - At Risk: ${atRiskEmployees?.length}, Accelerating: ${acceleratingEmployees?.length}`);

    // Helper to generate dates
    const daysAgo = (days: number) => {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return d.toISOString();
    };

    // 3. Insert specific history for At Risk
    if (atRiskEmployees) {
        for (const emp of atRiskEmployees) {
            console.log(`Generating history for At Risk: ${emp.name}`);
            const assessments = [];

            // Generate 5-8 poor assessments over last 30 days
            const count = 5 + Math.floor(Math.random() * 4);
            for (let i = 0; i < count; i++) {
                const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
                const score = 30 + Math.floor(Math.random() * 25); // 30-55
                assessments.push({
                    user_id: emp.id,
                    scenario_id: scenario.id,
                    score: score,
                    difficulty: scenario.difficulty || 'Medium',
                    feedback: JSON.stringify({ strengths: [], weaknesses: ["Concept understanding"], recommendations: ["Review basics"] }),
                    created_at: daysAgo(30 - (i * (30 / count))),
                    completed: true
                });
            }

            const { error } = await supabase.from('assessments').insert(assessments);
            if (error) console.error(`Failed to insert for ${emp.name}`, error);
        }
    }

    // 4. Insert specific history for Accelerating
    if (acceleratingEmployees) {
        for (const emp of acceleratingEmployees) {
            console.log(`Generating history for Accelerating: ${emp.name}`);
            const assessments = [];

            // Generate 10-15 good assessments showing growth
            const count = 10 + Math.floor(Math.random() * 6);
            for (let i = 0; i < count; i++) {
                const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
                // Trend upwards
                const progress = i / count; // 0 to 1
                const baseScore = 60 + (progress * 35); // Starts ~60 ends ~95
                const score = Math.min(100, Math.floor(baseScore + (Math.random() * 10 - 5)));

                assessments.push({
                    user_id: emp.id,
                    scenario_id: scenario.id,
                    score: score,
                    difficulty: scenario.difficulty || 'Medium',
                    feedback: JSON.stringify({ strengths: ["Optimization", "Architecture"], weaknesses: [], recommendations: ["Take harder challenges"] }),
                    created_at: daysAgo(40 - (i * (40 / count))),
                    completed: true
                });
            }

            const { error } = await supabase.from('assessments').insert(assessments);
            if (error) console.error(`Failed to insert for ${emp.name}`, error);
        }
    }

    console.log('Assessment history population complete.');
};

populateHistory();
