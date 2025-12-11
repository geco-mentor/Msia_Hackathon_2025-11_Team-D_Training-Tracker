
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

const listScenarios = async () => {
    const { data } = await supabase.from('scenarios').select('id, title, category');
    console.log('Current Scenarios:');
    data?.forEach(s => console.log(`[${s.id}] "${s.title}" (${s.category})`));
};

listScenarios();
