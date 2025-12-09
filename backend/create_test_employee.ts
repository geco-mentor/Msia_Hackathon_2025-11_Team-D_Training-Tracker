import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestEmployee() {
    const username = 'test_employee_' + Date.now();

    console.log(`Creating test employee: ${username}`);

    const { data, error } = await supabase
        .from('employees')
        .insert({
            name: 'Test Employee',
            username: username,
            password_hash: 'dummyhash',
            department: 'IT',
            total_points: 0
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating employee:', error);
    } else {
        const fs = require('fs');
        fs.writeFileSync('temp_id.txt', data.id);
        console.log('ID written to temp_id.txt');
    }
}

createTestEmployee();
