
/**
 * Reset John's Career Goal Script
 * 
 * call: npx ts-node src/scripts/reset_john_career_goal.ts
 */

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

async function resetJohnCareerGoal() {
    console.log('🔄 Resetting career goal for John...');

    // 1. Find John's ID
    const { data: user, error: userError } = await supabase
        .from('employees')
        .select('id')
        .eq('username', 'John')
        .single();

    if (userError || !user) {
        console.error('❌ Could not find user John:', userError?.message);
        return;
    }

    console.log(`   Found John (ID: ${user.id})`);

    // 2. Delete Career Goal
    const { error: deleteError } = await supabase
        .from('employee_career_goals')
        .delete()
        .eq('user_id', user.id);

    if (deleteError) {
        console.error('❌ Failed to delete career goal:', deleteError.message);
    } else {
        console.log('✅ Successfully reset career goal for John.');
    }
}

resetJohnCareerGoal().catch(console.error);
