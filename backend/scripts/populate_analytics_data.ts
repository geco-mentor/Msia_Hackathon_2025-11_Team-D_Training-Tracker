import { supabase } from '../src/config/database';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TARGET_USERNAME = 'employee'; // Default target, or we will pick the latest

async function populateAnalyticsData() {
    console.log('🚀 Starting Analytics Data Population...\n');

    try {
        // 1. Get Target Employee
        console.log('1️⃣  Finding Target Employee...');
        // Try to find the user 'employee' first (common test user), or fallback to latest
        let { data: employee, error: empError } = await supabase
            .from('employees')
            .select('*')
            .eq('username', TARGET_USERNAME)
            .single();

        if (empError || !employee) {
            console.log(`   User '${TARGET_USERNAME}' not found, fetching latest employee...`);
            const { data: latestEmp, error: latestError } = await supabase
                .from('employees')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (latestError || !latestEmp) throw new Error('No employees found in database!');
            employee = latestEmp;
        }

        console.log(`✅ Target Employee: ${employee.name} (${employee.username}) - ID: ${employee.id}`);

        // 2. Get Scenarios
        const { data: scenarios, error: scenError } = await supabase
            .from('scenarios')
            .select('id, title, difficulty, points');

        if (scenError || !scenarios || scenarios.length === 0) throw new Error('No scenarios found to generate assessments from.');
        console.log(`✅ Found ${scenarios.length} scenarios.`);

        // 3. Generate Assessments (Past 90 Days)
        console.log('\n2️⃣  Generating Assessments...');
        const NUM_ASSESSMENTS = 45;
        const assessments = [];
        let totalPoints = employee.total_points || 0;
        let winCount = 0;

        for (let i = 0; i < NUM_ASSESSMENTS; i++) {
            const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
            const daysAgo = Math.floor(Math.random() * 90);
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - daysAgo);

            // 70% chance of completion/success
            const isCompleted = Math.random() > 0.3;
            const score = isCompleted ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 50); // 70-100 or 0-50
            const points = isCompleted ? scenario.points : 0;

            if (isCompleted) {
                totalPoints += points;
                winCount++;
            }

            assessments.push({
                user_id: employee.id,
                scenario_id: scenario.id,
                score: score,
                difficulty: scenario.difficulty,
                // check_in removed as it does not exist in schema
                created_at: createdAt.toISOString(),
                completed_at: isCompleted ? createdAt.toISOString() : null,
                completed: isCompleted,
                points_awarded: points,
                // Standard assessments table usually implies post/main assessment
            });
        }

        // Insert Assessments
        // Using upsert for assessments might not be needed if they are just logs, but let's just insert.
        // If unique constraint on user_id + scenario_id exists for assessments too, we might need upsert, 
        // but typically employees can retake assessments.
        const { error: assessError } = await supabase.from('assessments').insert(assessments);
        if (assessError) console.error('Error inserting assessments:', assessError.message);
        else console.log(`✅ Inserted ${assessments.length} assessments.`);


        // 4. Generate Pre-Assessments
        console.log('\n3️⃣  Generating Pre-Assessments...');
        const preAssessments = [];
        // Use a set to track unique scenarios for this batch to avoid immediate conflicts within the array
        const usedPreScenarios = new Set();

        for (let i = 0; i < 10; i++) {
            const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
            if (usedPreScenarios.has(scenario.id)) continue;
            usedPreScenarios.add(scenario.id);

            const daysAgo = Math.floor(Math.random() * 90);
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - daysAgo);

            preAssessments.push({
                user_id: employee.id,
                scenario_id: scenario.id,
                is_familiar: Math.random() > 0.5,
                baseline_score: Math.floor(Math.random() * 60),
                completed: true,
                created_at: createdAt.toISOString(),
                completed_at: createdAt.toISOString(),
                current_difficulty: 'Normal'
            });
        }
        // Use upsert to handle potential existing records
        const { error: preAssessError } = await supabase
            .from('pre_assessments')
            .upsert(preAssessments, { onConflict: 'user_id,scenario_id' });

        if (preAssessError) console.error('Error inserting pre-assessments:', preAssessError.message);
        else console.log(`✅ Inserted/Updated ${preAssessments.length} pre-assessments.`);


        // 5. Generate Course Ratings
        console.log('\n4️⃣  Generating Course Ratings...');
        const ratings = [];
        const completedAssessments = assessments.filter(a => a.completed);
        const usedRatingScenarios = new Set();

        for (const assess of completedAssessments.slice(0, 15)) { // Rate 15 of them
            if (usedRatingScenarios.has(assess.scenario_id)) continue;
            usedRatingScenarios.add(assess.scenario_id);

            ratings.push({
                user_id: employee.id,
                scenario_id: assess.scenario_id,
                rating: Math.floor(Math.random() * 3) + 3, // 3 to 5
                review: 'Great scenario, very helpful!',
                created_at: assess.created_at
            });
        }
        const { error: ratingError } = await supabase
            .from('course_ratings')
            .upsert(ratings, { onConflict: 'user_id,scenario_id' });

        if (ratingError) console.error('Error inserting ratings:', ratingError.message);
        else console.log(`✅ Inserted/Updated ${ratings.length} course ratings.`);


        // 6. Generate Goals
        console.log('\n5️⃣  Generating Goals...');
        const goals = [
            { user_id: employee.id, description: 'Complete Advanced React Training', completed: false, created_at: new Date().toISOString() },
            { user_id: employee.id, description: 'Achieve 85% Win Rate', completed: false, created_at: new Date().toISOString() },
            { user_id: employee.id, description: 'Finish Security Module', completed: true, created_at: new Date(Date.now() - 86400000 * 5).toISOString() }
        ];
        const { error: goalError } = await supabase.from('goals').insert(goals);
        if (goalError) console.error('Error inserting goals:', goalError.message);
        else console.log(`✅ Inserted ${goals.length} goals.`);


        // 7. Update Employee Stats
        console.log('\n6️⃣  Updating Employee Stats...');
        // Simple ELO calculation simulation (random 800-1200 range or increment)
        const newElo = 1000 + Math.floor(Math.random() * 500);
        const winRate = winCount / NUM_ASSESSMENTS;

        const { error: updateError } = await supabase
            .from('employees')
            .update({
                total_points: totalPoints,
                elo_rating: newElo,
                win_rate: winRate,
                streak: Math.floor(Math.random() * 10),
                level: Math.floor(totalPoints / 100) + 1
            })
            .eq('id', employee.id);

        if (updateError) console.error('Error updating employee stats:', updateError.message);
        else console.log(`✅ Updated employee: Points=${totalPoints}, ELO=${newElo}, WinRate=${(winRate * 100).toFixed(1)}%`);

        console.log('\n🎉 Data population complete!');

    } catch (error) {
        console.error('\n❌ SCRIPT FAILED:', error);
        process.exit(1);
    }
}

populateAnalyticsData();
