import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const createManager = async () => {
    const username = 'EngineerManager';
    const password = 'EngineerManager';
    const name = 'Engineering Lead';
    const employee_id = 'MGR-001';
    const department = 'Engineering';
    const job_title = 'Engineering Manager'; // Keyword "Manager" will be used to assign role

    console.log(`Creating manager account: ${username}`);

    try {
        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Check if exists
        const { data: existing } = await supabase
            .from('employees')
            .select('id')
            .eq('username', username)
            .single();

        if (existing) {
            console.log('User already exists, updating password...');
            const { error: updateError } = await supabase
                .from('employees')
                .update({
                    password_hash,
                    department,
                    job_title
                })
                .eq('username', username);

            if (updateError) throw updateError;
            console.log('Manager updated successfully.');
        } else {
            console.log('Creating new manager...');
            const { error: insertError } = await supabase
                .from('employees')
                .insert({
                    name,
                    username,
                    employee_id,
                    password_hash,
                    job_title,
                    department,
                    job_description: 'Oversees the Engineering department and tracks team skill progression.',
                    skills_profile: {},
                    ranking: 0,
                    win_rate: 0,
                    streak: 0
                });

            if (insertError) throw insertError;
            console.log('Manager created successfully.');
        }

    } catch (error) {
        console.error('Error creating manager:', error);
    }
};

createManager();
