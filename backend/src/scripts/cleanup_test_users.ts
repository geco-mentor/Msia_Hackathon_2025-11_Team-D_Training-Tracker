
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const USERS_TO_DELETE = [
    'Check Employee',
    'Engineer Engineer',
    'Engineering Lead',
    'Test',
    'Test Employee',
    'Test User',
    'Bob Smith', // From screenshot, looks generic
    'Carol Davis', // From screenshot
    'Tina Perez', // From screenshot
    'Walt Simmons' // From screenshot
];

// Note: Keeping 'Cody Bell', 'Daniel', 'Eve', 'John', 'Louis' as valid/demo users.

async function cleanupUsers() {
    console.log(`\n🗑️  Cleaning up ${USERS_TO_DELETE.length} test users...`);

    // 1. Get IDs
    const { data: users, error: fetchError } = await supabase
        .from('employees')
        .select('id, name')
        .in('name', USERS_TO_DELETE);

    if (fetchError) {
        console.error('❌ Error fetching users:', fetchError.message);
        return;
    }

    if (!users || users.length === 0) {
        console.log('   No test users found to delete.');
        return;
    }

    const idsToDelete = users.map(u => u.id);
    console.log(`   Found ${users.length} users to delete:`, users.map(u => u.name).join(', '));

    // 2. Cascade Delete (Assessments, Scenarios, etc.)
    // Note: Supabase might have ON DELETE CASCADE set up, but let's be thorough just in case

    // Delete assessments
    await supabase.from('assessments').delete().in('user_id', idsToDelete);

    // Delete certifications
    await supabase.from('employee_certifications').delete().in('user_id', idsToDelete);

    // Delete career goals
    await supabase.from('employee_career_goals').delete().in('user_id', idsToDelete);

    // Delete pre_assessments
    await supabase.from('pre_assessments').delete().in('user_id', idsToDelete);

    // Delete course ratings
    await supabase.from('course_ratings').delete().in('user_id', idsToDelete);

    // Delete personal scenarios created by these users
    await supabase.from('scenarios').delete().in('creator_id', idsToDelete);

    // 2.5 Nullify manager references (Fix for foreign key constraint)
    const { error: managerUpdateError } = await supabase
        .from('employees')
        .update({ manager_id: null })
        .in('manager_id', idsToDelete);

    if (managerUpdateError) {
        console.warn('⚠️  Warning: Could not nullify manager_id references:', managerUpdateError.message);
    } else {
        console.log('   Updated employees to remove references to deleted managers.');
    }

    // 3. Delete Attributes
    const { error: deleteError } = await supabase
        .from('employees')
        .delete()
        .in('id', idsToDelete);

    if (deleteError) {
        console.error('❌ Error deleting users:', deleteError.message);
    } else {
        console.log('✅ Successfully deleted test users.');
    }
}

cleanupUsers();
