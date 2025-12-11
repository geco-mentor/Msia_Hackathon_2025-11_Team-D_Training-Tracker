
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Missing creds'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample career goals by department
const GOALS_BY_DEPT: Record<string, { title: string; description: string; timeframe: string }[]> = {
    'Engineering': [
        { title: 'Become a Staff Engineer', description: 'Lead major technical initiatives and mentor junior engineers.', timeframe: '3 years' },
        { title: 'Master Cloud Architecture', description: 'Get AWS Solutions Architect certification and lead cloud migrations.', timeframe: '2 years' },
        { title: 'Transition to Engineering Manager', description: 'Develop leadership skills and manage a team of 5+ engineers.', timeframe: '4 years' },
    ],
    'Sales': [
        { title: 'Hit President\'s Club', description: 'Exceed quota by 150% and earn recognition as a top performer.', timeframe: '1 year' },
        { title: 'Become Regional Sales Director', description: 'Lead a team of account executives and drive $10M in ARR.', timeframe: '5 years' },
    ],
    'Marketing': [
        { title: 'Lead a Major Campaign', description: 'Own and execute a company-wide brand campaign.', timeframe: '2 years' },
        { title: 'Marketing Director Role', description: 'Grow into a leadership role overseeing multiple marketing channels.', timeframe: '4 years' },
    ],
    'Finance': [
        { title: 'CPA Certification', description: 'Complete CPA certification to advance in finance career.', timeframe: '2 years' },
        { title: 'Finance Manager Promotion', description: 'Lead the financial planning and analysis team.', timeframe: '3 years' },
    ],
    'HR': [
        { title: 'SHRM Certification', description: 'Obtain SHRM-CP certification to enhance HR expertise.', timeframe: '1 year' },
        { title: 'Head of Talent Acquisition', description: 'Lead the recruiting function and build a world-class hiring process.', timeframe: '4 years' },
    ]
};

(async () => {
    console.log('Populating career goals for employees...');

    // Get all employees
    const { data: employees } = await supabase
        .from('employees')
        .select('id, name, department');

    if (!employees || employees.length === 0) {
        console.log('No employees found');
        return;
    }

    console.log(`Found ${employees.length} employees.`);

    // Clear existing goals first (optional, for clean demo data)
    const { error: deleteError } = await supabase.from('employee_career_goals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError) console.log('Could not clear existing goals:', deleteError.message);

    let insertedCount = 0;

    // Randomly assign goals to ~50% of employees
    for (const emp of employees) {
        // 50% chance to have a goal
        if (Math.random() < 0.5) continue;

        const deptGoals = GOALS_BY_DEPT[emp.department || 'Engineering'] || GOALS_BY_DEPT['Engineering'];
        const randomGoal = deptGoals[Math.floor(Math.random() * deptGoals.length)];

        const { error } = await supabase.from('employee_career_goals').insert({
            user_id: emp.id,
            goal_title: randomGoal.title,
            goal_description: randomGoal.description,
            target_timeframe: randomGoal.timeframe,
            status: 'active'
        });

        if (!error) {
            insertedCount++;
            console.log(`Added goal for ${emp.name}: "${randomGoal.title}"`);
        } else {
            console.error(`Failed for ${emp.name}:`, error.message);
        }
    }

    console.log(`\nDone! Inserted ${insertedCount} career goals.`);
})();
