
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Missing creds'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

// Organic Date Generator
const generateOrganicDate = (daysHistory: number) => {
    // 1. Weighted Randomness: Favor recent days
    // Using a power function: random^power will push numbers towards 1 (recent) or 0 (old)
    // using power < 1 pushes to 0 (old), power > 1 pushes to 1 (recent)
    // We want a trend UPWARDS, so more recent acts.

    const weight = 2.5; // Controls the curve. Higher = more exponential growth at the end.
    const randomFactor = Math.pow(Math.random(), 1 / weight); // 0 to 1, biased towards 1

    // Convert to days ago (0 to daysHistory)
    // If randomFactor is 1 -> 0 days ago. If 0 -> daysHistory ago.
    let daysAgo = Math.floor((1 - randomFactor) * daysHistory);

    // 2. Add Business Day Bias
    // If it falls on a weekend, 70% chance to move it to nearest Friday or Monday
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);

    const dayOfWeek = d.getDay(); // 0 = Sun, 6 = Sat
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        if (Math.random() > 0.3) {
            // Move to Friday or Monday randomly
            const shift = dayOfWeek === 0 ? 1 : -1; // Sun->Mon, Sat->Fri
            d.setDate(d.getDate() + shift);
        }
    }

    // 3. Randomize Time (9am - 6pm mostly, some late nights)
    let hour = 9 + Math.floor(Math.random() * 9); // 9am - 6pm
    if (Math.random() > 0.9) hour = 19 + Math.floor(Math.random() * 4); // 10% chance of late night work

    d.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));

    return d.toISOString();
};

(async () => {
    console.log('Refining activity timestamps for organic trend...');

    // Get all assessments ordered by ID
    const { data: assessments } = await supabase
        .from('assessments')
        .select('id, user_id')
        .order('user_id'); // Group by user somewhat

    if (!assessments) { console.log('No assessments'); return; }

    console.log(`Found ${assessments.length} assessments. Updating...`);

    let updated = 0;
    const batchSize = 50; // Update in batches if possible, but for timestamps we do indiv

    // We can run these in parallel chunks for speed
    const chunks = [];
    for (let i = 0; i < assessments.length; i += batchSize) {
        chunks.push(assessments.slice(i, i + batchSize));
    }

    for (const chunk of chunks) {
        await Promise.all(chunk.map(async (a) => {
            const newDate = generateOrganicDate(45); // Last 45 days
            const { error } = await supabase
                .from('assessments')
                .update({ created_at: newDate })
                .eq('id', a.id);
            if (!error) updated++;
        }));
        process.stdout.write('.');
    }

    console.log(`\nDone! Updated ${updated} records with organic timestamps.`);
})();
