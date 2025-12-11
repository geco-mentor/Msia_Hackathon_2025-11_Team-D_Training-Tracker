
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Missing creds'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    // Find Grace Martinez
    const { data: emp } = await supabase.from('employees').select('id').eq('name', 'Grace Martinez').single();
    if (!emp) { console.log('Employee not found'); return; }

    console.log('Employee ID:', emp.id);

    // Fetch assessments with scenario info
    const { data: assessments, error } = await supabase
        .from('assessments')
        .select('id, score, created_at, scenario:scenarios(title, skill)')
        .eq('user_id', emp.id)
        .limit(5);

    if (error) { console.error('Error:', error); return; }

    console.log('Assessments:', JSON.stringify(assessments, null, 2));
})();
