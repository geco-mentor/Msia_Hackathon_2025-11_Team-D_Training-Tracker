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

// Demo user names that we control
const DEMO_USERS = ['John', 'Louis', 'Eve', 'Daniel', 'Sarah', 'Mike', 'Jessica', 'David', 'Emily'];

async function fixEngineeringData() {
    console.log('=== Fixing Engineering Department Data ===\n');

    // 1. Get ALL Engineering employees
    const { data: engEmps, error: empError } = await supabase
        .from('employees')
        .select('id, name, username')
        .eq('department', 'Engineering');

    if (empError) {
        console.error('Error:', empError);
        return;
    }

    console.log('Found', engEmps?.length, 'Engineering employees:\n');

    // 2. Identify non-demo users
    const nonDemoUsers = engEmps?.filter(e => !DEMO_USERS.includes(e.name)) || [];
    const demoUsers = engEmps?.filter(e => DEMO_USERS.includes(e.name)) || [];

    console.log('Demo users:', demoUsers.map(e => e.name).join(', '));
    console.log('Non-demo users:', nonDemoUsers.map(e => e.name).join(', ') || 'None');

    // 3. Delete certifications for ALL Engineering employees (clean slate)
    const allIds = engEmps?.map(e => e.id) || [];

    console.log('\nDeleting all Engineering certifications...');
    const { error: certDeleteError } = await supabase
        .from('employee_certifications')
        .delete()
        .in('user_id', allIds);

    if (certDeleteError) {
        console.error('Error deleting certs:', certDeleteError);
    } else {
        console.log('✓ Deleted all Engineering certifications');
    }

    // 4. Delete assessments for non-demo users (they have uncontrolled data)
    if (nonDemoUsers.length > 0) {
        const nonDemoIds = nonDemoUsers.map(e => e.id);
        console.log('\nDeleting assessments for non-demo users...');

        const { error: assDeleteError } = await supabase
            .from('assessments')
            .delete()
            .in('user_id', nonDemoIds);

        if (assDeleteError) {
            console.error('Error deleting assessments:', assDeleteError);
        } else {
            console.log('✓ Deleted assessments for non-demo users');
        }
    }

    // 5. Add back ONLY specific certifications for Mike and Emily
    const mike = demoUsers.find(e => e.name === 'Mike');
    const emily = demoUsers.find(e => e.name === 'Emily');

    if (mike) {
        console.log('\nAdding CISSP cert for Mike...');
        await supabase.from('employee_certifications').insert({
            user_id: mike.id,
            name: 'CISSP',
            issuer: 'ISC2',
            issue_date: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString(),
            credential_id: 'CERT-MIKE-001'
        });
        console.log('✓ Added CISSP for Mike');
    }

    if (emily) {
        console.log('Adding PhD for Emily...');
        await supabase.from('employee_certifications').insert({
            user_id: emily.id,
            name: 'PhD Machine Learning',
            issuer: 'MIT',
            issue_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
            credential_id: 'CERT-EMILY-001'
        });
        console.log('✓ Added PhD for Emily');
    }

    console.log('\n=== Done! Refresh your dashboard ===');
}

fixEngineeringData();
