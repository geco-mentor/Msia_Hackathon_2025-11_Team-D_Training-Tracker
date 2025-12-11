
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

const checkSkills = async () => {
    const { data: employees } = await supabase
        .from('employees')
        .select('id, name, skills_profile')
        .limit(5);

    console.log('Sample Employee Skills:', JSON.stringify(employees, null, 2));
};

checkSkills();
