import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkData() {
    console.log('=== Checking Engineering Data ===\n');

    // Get all Engineering employees
    const { data: engEmployees, error: empError } = await supabase
        .from('employees')
        .select('id, name, department')
        .eq('department', 'Engineering');

    if (empError) {
        console.error('Error fetching employees:', empError);
        return;
    }

    console.log('Engineering Employees:', engEmployees?.length);
    engEmployees?.forEach(e => console.log('  -', e.name, '(' + e.id.slice(0, 8) + ')'));

    // Get assessments for Engineering employees
    const empIds = engEmployees?.map(e => e.id) || [];

    // Get assessments grouped by skill
    const { data: assessments, error: assError } = await supabase
        .from('assessments')
        .select(`
            user_id,
            score,
            scenarios (skill)
        `)
        .in('user_id', empIds);

    if (assError) {
        console.error('Error fetching assessments:', assError);
        return;
    }

    console.log('\nTotal Assessments:', assessments?.length);

    // Analyze scores by skill
    const skillStats = new Map<string, { scores: number[], experts: number }>();

    assessments?.forEach((a: any) => {
        const skill = a.scenarios?.skill || 'Unknown';
        const score = a.score || 0;

        if (!skillStats.has(skill)) {
            skillStats.set(skill, { scores: [], experts: 0 });
        }

        const stats = skillStats.get(skill)!;
        stats.scores.push(score);
        if (score >= 70) stats.experts++;
    });

    console.log('\n=== Scores by Skill ===');
    skillStats.forEach((stats, skill) => {
        const avg = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
        const expertRate = (stats.experts / stats.scores.length * 100).toFixed(0);
        console.log(`${skill}:`);
        console.log(`  Avg Score: ${avg.toFixed(1)} | Expert Rate: ${expertRate}% (${stats.experts}/${stats.scores.length})`);
        console.log(`  Scores: ${stats.scores.slice(0, 10).join(', ')}${stats.scores.length > 10 ? '...' : ''}`);
    });
}

checkData();
