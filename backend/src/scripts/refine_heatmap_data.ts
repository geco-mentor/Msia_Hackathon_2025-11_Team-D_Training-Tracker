
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
console.log('Current CWD:', process.cwd());
const envPath = path.resolve(process.cwd(), '../.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath, debug: true });
if (result.error) {
    console.error('Error loading .env:', result.error);
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define Department Expertises
const DEPARTMENT_SKILLS: Record<string, string[]> = {
    'Sales': ['Sales Strategy', 'Negotiation', 'Communication', 'Client Relations'],
    'Engineering': ['Software Development', 'Cybersecurity', 'Cloud Computing', 'Generative AI', 'Risk Management'],
    'Marketing': ['Digital Marketing', 'Content Strategy', 'SEO', 'Generative AI'],
    'Finance': ['Financial Analysis', 'Risk Management', 'Compliance'],
    'HR': ['Conflict Resolution', 'Communication', 'Leadership'],
};

// General fallback skills that everyone might be okay at, or bad at
const GENERAL_SKILLS = ['Time Management', 'Basic IT Security'];

async function refineData() {
    console.log('Starting data refinement...');

    // 1. Get all Employees
    const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, department');

    if (empError) {
        console.error('Error fetching employees:', empError);
        return;
    }

    if (!employees || employees.length === 0) {
        console.log('No employees found.');
        return;
    }

    console.log(`Found ${employees.length} employees.`);

    // 2. Get all Scenarios/Skills
    const { data: scenarios, error: scenError } = await supabase
        .from('scenarios')
        .select('id, title, skill, category');

    if (scenError) {
        console.error('Error fetching scenarios:', scenError);
        return;
    }

    if (!scenarios || scenarios.length === 0) {
        console.log('No scenarios found.');
        return;
    }

    // Helper to find partial match of skill name
    const getScenarioIdsForTopics = (topics: string[]) => {
        return scenarios
            .filter(s => {
                const title = (s.title || '').toLowerCase();
                const skill = (s.skill || '').toLowerCase();
                const category = (s.category || '').toLowerCase();
                return topics.some(t =>
                    title.includes(t.toLowerCase()) ||
                    skill.includes(t.toLowerCase()) ||
                    category.includes(t.toLowerCase())
                );
            })
            .map(s => s.id);
    };

    let updatedCount = 0;

    // 3. Iterate through employees and adjust their assessment scores
    for (const emp of employees) {
        const dept = emp.department || 'Unknown';
        const strongTopics = DEPARTMENT_SKILLS[dept] || [];

        // Find scenarios that match these strong topics
        const strongScenarioIds = getScenarioIdsForTopics(strongTopics);

        // Fetch user's existing assessments
        const { data: assessments, error: assessError } = await supabase
            .from('assessments')
            .select('id, scenario_id, score')
            .eq('user_id', emp.id);

        if (assessError) {
            console.error(`Error fetching assessments for emp ${emp.id}:`, assessError);
            continue;
        }

        if (!assessments || assessments.length === 0) continue;

        const updates = [];

        for (const assessment of assessments) {
            const isStrong = strongScenarioIds.includes(assessment.scenario_id);

            // LOGIC:
            // strong skill -> Score between 75 and 98 (Expert/Proficient)
            // weak skill -> Score between 30 and 65 (Novice)

            let newScore = 0;
            if (isStrong) {
                // High score
                newScore = Math.floor(Math.random() * (98 - 75 + 1)) + 75;
            } else {
                // Low/Average score
                newScore = Math.floor(Math.random() * (65 - 30 + 1)) + 30;

                // Occasional anomaly (smart person outside their field) - 10% chance
                if (Math.random() < 0.1) {
                    newScore = Math.floor(Math.random() * (85 - 60 + 1)) + 60;
                }
            }

            // Only update if the current score is logically overlapping or we just want to force it
            // Let's force update to ensure the heatmap looks right
            updates.push({
                id: assessment.id,
                score: newScore,
                completed: true
            });
        }

        // Perform bulk upsert/update involves just looping for now or individual updates
        // Supabase upsert requires unique constraint. updating by ID is safe.
        for (const update of updates) {
            const { error: updateError } = await supabase
                .from('assessments')
                .update({ score: update.score })
                .eq('id', update.id);

            if (!updateError) updatedCount++;
        }
    }

    console.log(`Refinement complete. Updated ${updatedCount} assessment records.`);
}

refineData().catch(console.error);
