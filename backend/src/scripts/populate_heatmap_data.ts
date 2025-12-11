import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(process.cwd(), '../.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define Department Expertises - skills where each department should excel
const DEPARTMENT_SKILLS: Record<string, string[]> = {
    'Sales': ['Sales Strategy', 'sales'],
    'Engineering': ['Software Development', 'Cybersecurity Awareness', 'Generative AI', 'Risk Management', 'prog'],
    'Marketing': ['Generative AI', 'genai'],
    'Finance': ['Risk Management', 'General Knowledge'],
    'HR': ['General Knowledge'],
    'IT': ['Software Development', 'Cybersecurity Awareness', 'Risk Management'],
    'Operations': ['Risk Management', 'General Knowledge'],
};

async function populateData() {
    console.log('Starting data population for more variation...');

    // 1. Get all Employees
    const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, name, department');

    if (empError) {
        console.error('Error fetching employees:', empError);
        return;
    }

    if (!employees || employees.length === 0) {
        console.log('No employees found.');
        return;
    }

    console.log(`Found ${employees.length} employees.`);

    // 2. Get all Scenarios
    const { data: scenarios, error: scenError } = await supabase
        .from('scenarios')
        .select('id, title, skill, category');

    if (scenError || !scenarios) {
        console.error('Error fetching scenarios:', scenError);
        return;
    }

    console.log(`Found ${scenarios.length} scenarios.`);

    // Helper to check if a skill matches department strength
    const isStrongSkill = (dept: string, scenario: any): boolean => {
        const strongSkills = DEPARTMENT_SKILLS[dept] || [];
        const title = (scenario.title || '').toLowerCase();
        const skill = (scenario.skill || '').toLowerCase();

        return strongSkills.some(s =>
            title.includes(s.toLowerCase()) ||
            skill.includes(s.toLowerCase())
        );
    };

    let createdCount = 0;
    let updatedCount = 0;

    // 3. For each employee, ensure they have assessments for ALL scenarios
    for (const emp of employees) {
        const dept = emp.department || 'Unknown';

        // Get existing assessments for this employee
        const { data: existingAssessments } = await supabase
            .from('assessments')
            .select('scenario_id')
            .eq('user_id', emp.id);

        const existingScenarioIds = new Set((existingAssessments || []).map(a => a.scenario_id));

        for (const scenario of scenarios) {
            const isStrong = isStrongSkill(dept, scenario);

            // Determine score based on department strength
            let score: number;
            if (isStrong) {
                // Strong skill: 70-98 (Expert/Proficient)
                score = Math.floor(Math.random() * (98 - 70 + 1)) + 70;
            } else {
                // Weak skill: 25-55 (Novice)
                score = Math.floor(Math.random() * (55 - 25 + 1)) + 25;

                // 15% chance of being "naturally talented" outside their field
                if (Math.random() < 0.15) {
                    score = Math.floor(Math.random() * (75 - 55 + 1)) + 55;
                }
            }

            if (existingScenarioIds.has(scenario.id)) {
                // Update existing assessment
                const { error: updateError } = await supabase
                    .from('assessments')
                    .update({
                        score,
                        completed: true
                    })
                    .eq('user_id', emp.id)
                    .eq('scenario_id', scenario.id);

                if (!updateError) updatedCount++;
            } else {
                // Create new assessment
                const { error: insertError } = await supabase
                    .from('assessments')
                    .insert({
                        user_id: emp.id,
                        scenario_id: scenario.id,
                        score,
                        completed: true,
                        difficulty: ['Easy', 'Medium', 'Hard'][Math.floor(Math.random() * 3)],
                        created_at: new Date().toISOString(),
                    });

                if (!insertError) createdCount++;
                else console.error(`Insert error for ${emp.name}:`, insertError.message);
            }
        }

        // Log progress every 10 employees
        if (employees.indexOf(emp) % 10 === 0) {
            console.log(`Processed ${employees.indexOf(emp) + 1}/${employees.length} employees...`);
        }
    }

    console.log(`\nPopulation complete!`);
    console.log(`  Created: ${createdCount} new assessments`);
    console.log(`  Updated: ${updatedCount} existing assessments`);
    console.log(`  Total records affected: ${createdCount + updatedCount}`);
}

populateData().catch(console.error);
