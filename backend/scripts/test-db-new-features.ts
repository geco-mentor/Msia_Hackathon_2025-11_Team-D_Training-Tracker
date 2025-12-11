import { supabase } from '../src/config/database';
import dotenv from 'dotenv';
import path from 'path';

// Ensure env is loaded (if running standalone)
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testDatabaseFeatures() {
    console.log('🚀 Starting Database Feature Verification...\n');

    const testJobTitle = `Test Job ${Date.now()}`;
    const testUsername = `testuser_${Date.now()}`;
    const testEmployeeId = `EMP_${Date.now()}`;

    try {
        // 1. Test Jobs Table
        console.log('1️⃣  Testing Jobs Table...');
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .insert({
                title: testJobTitle,
                description: 'A test job for verification',
                required_skills: ['Skill A', 'Skill B']
            })
            .select()
            .single();

        if (jobError) throw new Error(`Job creation failed: ${jobError.message}`);
        console.log('✅ Job created:', job.title, `(ID: ${job.id})`);

        // 2. Test Employees with New Fields
        console.log('\n2️⃣  Testing Employee with Department & Job...');
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .insert({
                name: 'Test User',
                username: testUsername,
                employee_id: testEmployeeId,
                password_hash: 'hash',
                job_title: testJobTitle, // Legacy field
                job_id: job.id,         // New field
                department: 'QA Department', // New field
                total_points: 150
            })
            .select()
            .single();

        if (empError) throw new Error(`Employee creation failed: ${empError.message}`);

        console.log('✅ Employee created:', employee.username);
        console.log('   - Department:', employee.department);
        console.log('   - Job ID:', employee.job_id);

        if (employee.department !== 'QA Department') throw new Error('Department mismatch!');
        if (employee.job_id !== job.id) throw new Error('Job ID mismatch!');

        // 3. Test Leaderboard View
        console.log('\n3️⃣  Testing Leaderboard View...');
        const { data: leaderboard, error: lbError } = await supabase
            .from('leaderboard')
            .select('*')
            .eq('username', testUsername)
            .single();

        if (lbError) throw new Error(`Leaderboard query failed: ${lbError.message}`);

        console.log('✅ Leaderboard entry found:', leaderboard);
        if (leaderboard.department !== 'QA Department') throw new Error('Leaderboard department mismatch!');

        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
        await supabase.from('employees').delete().eq('id', employee.id);
        await supabase.from('jobs').delete().eq('id', job.id);
        console.log('✅ Cleanup complete.');

        console.log('\n🎉 ALL DATABASE TESTS PASSED!');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error);
        process.exit(1);
    }
}

testDatabaseFeatures();
