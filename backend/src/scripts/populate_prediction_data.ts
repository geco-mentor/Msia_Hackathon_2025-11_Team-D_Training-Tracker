
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const populatePredictionData = async () => {
    console.log('Starting prediction data population...');

    // 1. Get Engineering employees (excluding Manager)
    const { data: employees, error } = await supabase
        .from('employees')
        .select('id, name')
        .eq('department', 'Engineering')
        .neq('job_title', 'Engineering Manager');

    if (error || !employees) {
        console.error('Error fetching employees:', error);
        return;
    }

    console.log(`Found ${employees.length} candidates in Engineering.`);

    // Shuffle array
    const shuffled = [...employees].sort(() => 0.5 - Math.random());

    // 2. Set "At Risk" (Low Win Rate, Zero Streak) - Take 2
    const atRiskCandidates = shuffled.slice(0, 2);
    for (const emp of atRiskCandidates) {
        const { error: updateError } = await supabase
            .from('employees')
            .update({
                win_rate: 0.35, // Below 0.45 threshold
                streak: 0,      // Inactive
                elo_rating: 920 // Low Elo
            })
            .eq('id', emp.id);

        if (updateError) console.error(`Failed to update ${emp.name}:`, updateError);
        else console.log(`MARKED [At Risk]: ${emp.name}`);
    }

    // 3. Set "Accelerating" (High Win Rate, High Streak, High Elo) - Take 2 (from remaining)
    const acceleratingCandidates = shuffled.slice(2, 4);
    for (const emp of acceleratingCandidates) {
        const { error: updateError } = await supabase
            .from('employees')
            .update({
                win_rate: 0.88, // Above 0.70 threshold
                streak: 12,     // Above 3
                elo_rating: 1450 // Above 1200
            })
            .eq('id', emp.id);

        if (updateError) console.error(`Failed to update ${emp.name}:`, updateError);
        else console.log(`MARKED [Accelerating]: ${emp.name}`);
    }

    console.log('Prediction data population complete.');
};

populatePredictionData();
