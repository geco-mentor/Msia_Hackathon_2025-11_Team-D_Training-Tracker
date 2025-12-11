
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function updateSkillsProfile() {
    console.log('🔄 Calculating and updating employee skills profiles...');

    // 1. Fetch Assessments with Scenario info
    // We fetch ALL assessments to build comprehensive profiles
    const { data: assessments, error } = await supabase
        .from('assessments')
        .select(`
            user_id,
            score,
            scenarios (
                skill,
                category,
                title
            )
        `)
        .not('score', 'is', null);

    if (error) {
        console.error('❌ Error fetching assessments:', error.message);
        return;
    }

    if (!assessments || assessments.length === 0) {
        console.log('⚠️ No assessments found to process.');
        return;
    }

    console.log(`📊 Processing ${assessments.length} assessments...`);

    // 2. Aggregate Scores per User per Skill
    // Structure: Map<UserId, Map<SkillName, { total, count }>>
    const userSkillsMap = new Map<string, Map<string, { total: number; count: number }>>();

    assessments.forEach((a: any) => {
        const userId = a.user_id;
        const scenario = a.scenarios;

        if (!userId || !scenario) return;

        // Determine skill name - prioritize 'skill' column, then 'category'
        // This should match the matrix logic or be the source of truth
        let skillName = scenario.skill;
        if (!skillName || skillName === 'General') {
            skillName = scenario.category || 'General';
        }

        if (!userSkillsMap.has(userId)) {
            userSkillsMap.set(userId, new Map());
        }

        const userSkills = userSkillsMap.get(userId)!;
        const current = userSkills.get(skillName) || { total: 0, count: 0 };

        userSkills.set(skillName, {
            total: current.total + (a.score || 0),
            count: current.count + 1
        });
    });

    // 3. Update Employees
    let updatedCount = 0;

    for (const [userId, skills] of userSkillsMap.entries()) {
        const skillsProfile: Record<string, number> = {};

        skills.forEach((data, skillName) => {
            skillsProfile[skillName] = Math.round(data.total / data.count);
        });

        // Update DB
        const { error: updateError } = await supabase
            .from('employees')
            .update({ skills_profile: skillsProfile })
            .eq('id', userId);

        if (updateError) {
            console.error(`❌ Failed to update user ${userId}:`, updateError.message);
        } else {
            updatedCount++;
            // Optional: Log specific updates for debugging
            // console.log(`   Updated ${userId} with ${Object.keys(skillsProfile).length} skills.`);
        }
    }

    console.log(`✅ Successfully updated skills profiles for ${updatedCount} employees.`);
}

updateSkillsProfile();
