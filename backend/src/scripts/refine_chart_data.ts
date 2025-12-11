import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function refineChartData() {
    console.log('=== Refining Chart Data ===\n');

    // 1. Rename "General Knowledge" to "Business Operations"
    console.log('1. Renaming "General Knowledge" skill to "Business Operations"...');
    const { data: updatedScenarios, error: skillError } = await supabase
        .from('scenarios')
        .update({ skill: 'Business Operations' })
        .eq('skill', 'General Knowledge')
        .select('id, title, skill');

    if (skillError) {
        console.error('Error updating skill name:', skillError);
    } else {
        console.log(`   Updated ${updatedScenarios?.length || 0} scenarios.`);
    }

    // 2. Spread assessment dates across the last 30 days with trendy pattern
    console.log('\n2. Spreading assessment dates for trendy activity chart...');

    const { data: assessments, error: assessError } = await supabase
        .from('assessments')
        .select('id, created_at');

    if (assessError || !assessments) {
        console.error('Error fetching assessments:', assessError);
        return;
    }

    console.log(`   Found ${assessments.length} assessments to redistribute.`);

    const now = new Date();
    let updatedCount = 0;

    // Create a "trendy" pattern: 
    // Week 1: Low activity (building up)
    // Week 2: Peak (training push)
    // Week 3: Dip (post-training cooldown)
    // Week 4: Recovery (ongoing learning)
    const getWeightedDay = (): number => {
        const rand = Math.random();
        if (rand < 0.15) {
            // 15% in week 1 (days 21-28 ago)
            return Math.floor(Math.random() * 7) + 21;
        } else if (rand < 0.45) {
            // 30% in week 2 peak (days 14-21 ago)
            return Math.floor(Math.random() * 7) + 14;
        } else if (rand < 0.65) {
            // 20% in week 3 dip (days 7-14 ago)
            return Math.floor(Math.random() * 7) + 7;
        } else {
            // 35% in week 4 recovery (days 0-7 ago)
            return Math.floor(Math.random() * 7);
        }
    };

    // Batch update in chunks for efficiency
    const BATCH_SIZE = 50;
    for (let i = 0; i < assessments.length; i += BATCH_SIZE) {
        const batch = assessments.slice(i, i + BATCH_SIZE);

        for (const assessment of batch) {
            const daysAgo = getWeightedDay();
            const newDate = new Date(now);
            newDate.setDate(newDate.getDate() - daysAgo);
            // Add some hour variation too
            newDate.setHours(Math.floor(Math.random() * 14) + 8); // 8am to 10pm
            newDate.setMinutes(Math.floor(Math.random() * 60));

            const { error: updateError } = await supabase
                .from('assessments')
                .update({ created_at: newDate.toISOString() })
                .eq('id', assessment.id);

            if (!updateError) updatedCount++;
        }

        console.log(`   Processed ${Math.min(i + BATCH_SIZE, assessments.length)}/${assessments.length}...`);
    }

    console.log(`   Updated dates for ${updatedCount} assessments.`);

    // 3. Also update pre_assessments dates for Training Impact chart consistency
    console.log('\n3. Updating pre_assessment dates...');
    const { data: preAssessments, error: preError } = await supabase
        .from('pre_assessments')
        .select('id');

    if (preError) {
        console.error('Error fetching pre_assessments:', preError);
    } else if (preAssessments) {
        let preUpdatedCount = 0;
        for (const pre of preAssessments) {
            // Pre-assessments should be earlier than post-assessments
            const daysAgo = Math.floor(Math.random() * 14) + 14; // 14-28 days ago
            const newDate = new Date(now);
            newDate.setDate(newDate.getDate() - daysAgo);
            newDate.setHours(Math.floor(Math.random() * 14) + 8);

            const { error: updateError } = await supabase
                .from('pre_assessments')
                .update({ created_at: newDate.toISOString() })
                .eq('id', pre.id);

            if (!updateError) preUpdatedCount++;
        }
        console.log(`   Updated ${preUpdatedCount} pre_assessments.`);
    }

    console.log('\n=== Refinement Complete! ===');
    console.log('The Department Activity chart should now show natural ups and downs.');
    console.log('Training Impact should show pre-assessments earlier than post-assessments.');
}

refineChartData().catch(console.error);
