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

const SKILLS = [
    'Software Development', 'Generative AI', 'Cybersecurity Awareness',
    'Risk Management', 'Business Operations', 'Sales Strategy'
];

async function checkStatus() {
    console.log('=== ENGINEERING DEPARTMENT DIAGNOSTICS ===\n');

    // 1. Employees
    const { data: employees } = await supabase
        .from('employees')
        .select('*')
        .eq('department', 'Engineering');

    console.log(`Employees found: ${employees?.length || 0}`);
    if (!employees || employees.length === 0) return;

    employees.forEach(e => {
        console.log(` - ${e.name} (${e.id.slice(0, 8)})`);
    });

    const empIds = employees.map(e => e.id);

    // 2. Certifications
    const { data: certs } = await supabase
        .from('employee_certifications')
        .select('user_id, name')
        .in('user_id', empIds);

    console.log(`\nCertifications found: ${certs?.length || 0}`);
    certs?.forEach(c => {
        const emp = employees.find(e => e.id === c.user_id);
        console.log(` - ${emp?.name}: ${c.name}`);
    });

    // 3. Assessments & Expert Status
    console.log('\n--- Skill Breakdown ---');

    for (const skill of SKILLS) {
        // Get scenarios for this skill
        const { data: scenarios } = await supabase
            .from('scenarios')
            .select('id')
            .ilike('skill', `%${skill}%`);

        const scenarioIds = scenarios?.map(s => s.id) || [];

        if (scenarioIds.length === 0) {
            console.log(`\n${skill}: No scenarios found?`);
            continue;
        }

        // Get assessments for these scenarios and employees
        const { data: assessments } = await supabase
            .from('assessments')
            .select('user_id, score')
            .in('user_id', empIds)
            .in('scenario_id', scenarioIds);

        if (!assessments || assessments.length === 0) {
            console.log(`\n${skill}: NO ASSESSMENTS FOUND`);
            continue;
        }

        let expertCount = 0;
        const employeeStats = new Map<string, { maxScore: number, hasCert: boolean }>();

        // Init stats
        employees.forEach(e => {
            const hasCert = certs?.some(c => c.user_id === e.id &&
                (c.name.includes(skill) ||
                    (skill === 'Cybersecurity Awareness' && c.name.includes('CISSP')) ||
                    (skill === 'Generative AI' && c.name.includes('PhD'))
                )
            ) || false;
            employeeStats.set(e.id, { maxScore: 0, hasCert });
        });

        assessments.forEach(a => {
            const current = employeeStats.get(a.user_id)!;
            if (a.score > current.maxScore) current.maxScore = a.score;
        });

        console.log(`\n${skill} (Total Assessments: ${assessments.length})`);

        employeeStats.forEach((stats, id) => {
            const emp = employees.find(e => e.id === id);
            // Replicate analyticsController logic: Score >= 70 OR Cert
            const isExpert = stats.maxScore >= 70 || stats.hasCert;
            if (isExpert) expertCount++;

            console.log(`  - ${emp?.name}: MaxScore=${stats.maxScore}, Cert=${stats.hasCert} => Expert=${isExpert}`);
        });

        console.log(`  => Expert Rate: ${(expertCount / employees.length * 100).toFixed(0)}% (${expertCount}/${employees.length})`);
    }
}

checkStatus();
