
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MAPPINGS: Record<string, { title: string; category?: string }> = {
    // Programming
    'prog': { title: 'Programming Fundamentals', category: 'Software Development' },
    'prog 2': { title: 'Advanced Programming Concepts', category: 'Software Development' },

    // Sales
    'sales': { title: 'Sales Strategy Fundamentals', category: 'Sales' },
    'sales 2': { title: 'Advanced Negotiation Techniques', category: 'Sales' },

    // GenAI
    'genai': { title: 'Generative AI Basics', category: 'Artificial Intelligence' },
    'genai 2': { title: 'Prompt Engineering', category: 'Artificial Intelligence' },
    'genai 3': { title: 'AI Ethics & Safety', category: 'Artificial Intelligence' },

    // Cybersecurity
    'TOPIC 1 THE SECURITY ENVIRONMENT': { title: 'Cybersecurity: The Security Environment', category: 'Cybersecurity' },
    'TOPIC 3 ENTERPRISE ROLES AND STRUCTURES': { title: 'Cybersecurity: Enterprise Architecture', category: 'Cybersecurity' },
    'TOPIC 5 SECURITY PLANS AND POLICIES': { title: 'Cybersecurity: Plans & Policies', category: 'Cybersecurity' },
    'TOPIC 6 SECURITY STANDARDS AND CONTROLS': { title: 'Cybersecurity: Standards & Controls', category: 'Cybersecurity' },
    'TOPIC 7 Risk Mgmt Part 2': { title: 'Cybersecurity: Risk Management II', category: 'Cybersecurity' }
};

const renameScenarios = async () => {
    console.log('Starting scenario renaming...');

    // Fetch all scenarios
    const { data: scenarios, error } = await supabase.from('scenarios').select('id, title');

    if (error || !scenarios) {
        console.error('Error fetching scenarios:', error);
        return;
    }

    let updateCount = 0;

    for (const scenario of scenarios) {
        const mapping = MAPPINGS[scenario.title];

        if (mapping) {
            console.log(`Renaming "${scenario.title}" -> "${mapping.title}"`);

            const { error: updateError } = await supabase
                .from('scenarios')
                .update({
                    title: mapping.title,
                    category: mapping.category // Also normalize categories
                })
                .eq('id', scenario.id);

            if (updateError) {
                console.error(`Failed to update ${scenario.title}:`, updateError);
            } else {
                updateCount++;
            }
        }
    }

    console.log(`Renaming complete. Updated ${updateCount} scenarios.`);
};

renameScenarios();
