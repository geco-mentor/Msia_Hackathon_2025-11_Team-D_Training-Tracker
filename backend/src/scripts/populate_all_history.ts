
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

// Helper to generate dates
const daysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
};

const populateAllHistory = async () => {
    console.log('Starting comprehensive assessment history population for ALL employees...');

    // 1. Get Scenarios
    const { data: scenarios, error: scenarioError } = await supabase
        .from('scenarios')
        .select('id, title, skill, difficulty');

    if (scenarioError || !scenarios || scenarios.length === 0) {
        console.error('Error fetching scenarios or no scenarios found:', scenarioError);
        return;
    }
    console.log(`Found ${scenarios.length} scenarios.`);

    // 2. Get ALL Employees
    const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, name, department');

    if (empError || !employees || employees.length === 0) {
        console.error('Error fetching employees:', empError);
        return;
    }

    console.log(`Found ${employees.length} employees. Populating history...`);

    let totalInserted = 0;

    for (const emp of employees) {
        // Check if employee already has assessments
        const { count } = await supabase
            .from('assessments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', emp.id);

        if (count && count > 0) {
            console.log(`Skipping ${emp.name} - already has ${count} assessments`);
            continue;
        }

        console.log(`Generating history for: ${emp.name} (${emp.department})`);

        const assessments = [];

        // Generate 5-10 random assessments over the last 60 days
        const numAssessments = 5 + Math.floor(Math.random() * 6);

        for (let i = 0; i < numAssessments; i++) {
            const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

            // Generate a score with some variance but generally between 50-90
            const baseScore = 50 + Math.floor(Math.random() * 40);
            // Add a slight upward trend for later assessments
            const trendBonus = Math.floor((i / numAssessments) * 15);
            const score = Math.min(100, baseScore + trendBonus);

            assessments.push({
                user_id: emp.id,
                scenario_id: scenario.id,
                score: score,
                difficulty: scenario.difficulty || 'Medium',
                feedback: JSON.stringify({
                    strengths: ["Good understanding of core concepts"],
                    weaknesses: score < 70 ? ["Needs improvement in advanced topics"] : [],
                    recommendations: ["Continue practicing with similar scenarios"]
                }),
                created_at: daysAgo(60 - (i * (60 / numAssessments))),
                completed: true
            });
        }

        const { error } = await supabase.from('assessments').insert(assessments);
        if (error) {
            console.error(`Failed to insert for ${emp.name}:`, error.message);
        } else {
            totalInserted += assessments.length;
        }
    }

    console.log(`Complete! Inserted ${totalInserted} assessment records.`);
};

populateAllHistory();
