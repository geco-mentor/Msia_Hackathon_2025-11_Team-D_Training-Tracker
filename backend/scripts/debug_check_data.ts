import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve('c:/Users/M S I/Documents/GitProject/ai-hackathon/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
    console.log('=== CHECKING SCENARIO DATA ===');

    const { data: scenarios, error } = await supabase
        .from('scenarios')
        .select('id, title, skill');

    if (error) {
        console.error('Error fetching scenarios:', error);
        return;
    }

    console.log('Current Scenarios:');
    scenarios.forEach(s => {
        console.log(`[${s.id}] Title: "${s.title}" | Skill: "${s.skill}"`);
    });
}

checkData().catch(console.error);
