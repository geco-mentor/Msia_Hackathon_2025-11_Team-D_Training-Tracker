import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { determineMainSkill } from '../src/services/awsService';

// Load environment variables
dotenv.config({ path: path.resolve('c:/Users/M S I/Documents/GitProject/ai-hackathon/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Heuristic mapper for when AI is unavailable or fails
function mapTitleToSkill(title: string): string | null {
    const t = title.toLowerCase();
    if (t.includes('genai') || t.includes('gpt') || t.includes('llm')) return 'Generative AI';
    if (t.includes('sales') || t.includes('selling') || t.includes('negotiation')) return 'Sales Strategy';
    if (t.includes('security') || t.includes('cyber') || t.includes('phishing')) return 'Cybersecurity Awareness';
    if (t.includes('prog') || t.includes('code') || t.includes('dev')) return 'Software Development';
    if (t.includes('manager') || t.includes('leadership')) return 'Leadership';
    if (t.includes('compliance') || t.includes('gdpr') || t.includes('regulate')) return 'Compliance';
    if (t.includes('risk')) return 'Risk Management';
    return null;
}

async function cleanData() {
    console.log('=== STARTING DATA CLEANUP ===');
    console.log('AWS Config Check:', {
        region: process.env.AWS_REGION || process.env.AWS_S3_REGION,
        hasKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecret: !!process.env.AWS_SECRET_ACCESS_KEY
    });

    // 1. Fetch all scenarios
    const { data: scenarios, error } = await supabase
        .from('scenarios')
        .select('*');

    if (error) {
        console.error('Error fetching scenarios:', error);
        return;
    }

    console.log(`Found ${scenarios.length} scenarios to check.`);

    // Track used titles to avoid collisions during batch processing
    const usedTitles = new Set(scenarios.map(s => s.title.toLowerCase()));

    for (const scenario of scenarios) {
        let updates: any = {};
        console.log(`\nProcessing: "${scenario.title}" (ID: ${scenario.id})`);

        // Check 1: Fix Title
        let newTitle = scenario.title;
        newTitle = newTitle.replace(/^\d+-/, '');
        newTitle = newTitle.replace(/^-+/, '');
        newTitle = newTitle.replace(/\s+\([a-z0-9]{3,6}\)$/i, '');
        newTitle = newTitle.trim();

        if (newTitle !== scenario.title) {
            // Check for uniqueness collision in REAL-TIME
            let candidateTitle = newTitle;
            let i = 2;
            while (usedTitles.has(candidateTitle.toLowerCase())) {
                candidateTitle = `${newTitle} ${i}`;
                i++;
            }
            newTitle = candidateTitle;

            console.log(`-> Title update: "${scenario.title}" -> "${newTitle}"`);
            updates.title = newTitle;

            // Update tracking set (remove old, add new is tricky if old is kept by another, but strictly we just ADD new)
            usedTitles.add(newTitle.toLowerCase());
        }

        // Check 2: Fix Skill (if "General", "General Knowledge", null, or same as title)
        let needsSkillUpdate = !scenario.skill ||
            scenario.skill === 'General' ||
            scenario.skill === 'General Knowledge' ||
            scenario.skill === scenario.title ||
            scenario.skill === newTitle;

        if (needsSkillUpdate) {
            console.log('-> Skill needs update. checking heuristics...');

            // Try Heuristics First
            let newSkill = mapTitleToSkill(newTitle);

            if (!newSkill) {
                console.log('-> Heuristics failed. Trying AI...');
                const text = scenario.scenario_text || newTitle;
                newSkill = await determineMainSkill(text);
            }

            console.log(`-> New Skill identified: "${newSkill}"`);
            updates.skill = newSkill;
        }

        // Apply updates if any
        if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
                .from('scenarios')
                .update(updates)
                .eq('id', scenario.id);

            if (updateError) {
                console.error('Failed to update scenario:', updateError.message);
            } else {
                console.log('✓ Scenario updated successfully');
            }
        } else {
            console.log('-> No changes needed.');
        }
    }

    console.log('\n=== CLEANUP COMPLETE ===');
}

cleanData().catch(console.error);
