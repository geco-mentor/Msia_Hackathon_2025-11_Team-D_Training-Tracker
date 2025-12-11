
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Missing creds'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

const daysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
};

(async () => {
    console.log('Fixing assessment timestamps...');

    // Get all employees
    const { data: employees } = await supabase.from('employees').select('id, name');

    if (!employees) { console.log('No employees'); return; }

    let updated = 0;

    for (const emp of employees) {
        // Get assessments for this employee ordered by id
        const { data: assessments } = await supabase
            .from('assessments')
            .select('id')
            .eq('user_id', emp.id)
            .order('id');

        if (!assessments || assessments.length === 0) continue;

        // Spread timestamps evenly over 45 days
        for (let i = 0; i < assessments.length; i++) {
            const daysOffset = Math.floor((45 / assessments.length) * (assessments.length - i - 1));
            const newDate = daysAgo(daysOffset);

            const { error } = await supabase
                .from('assessments')
                .update({ created_at: newDate })
                .eq('id', assessments[i].id);

            if (!error) updated++;
        }
    }

    console.log(`Updated ${updated} assessment timestamps.`);
})();
