import dotenv from 'dotenv';
import path from 'path';
import { generateChallenge, evaluateResponse } from './src/services/challengeService';
import { generateGoals } from './src/services/goalService';
import { supabase } from './src/config/database';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.MOCK_AI = 'false';

const runTests = async () => {
    console.log('🚀 Starting Verification Tests...\n');

    // 1. Test Challenge Generation
    console.log('🧪 Testing Challenge Generation...');
    try {
        const challenge = await generateChallenge('Software Engineer', 'Normal');
        console.log('✅ Challenge Generated:', challenge.skill);
        console.log('   Scenario:', challenge.scenario_text);
        console.log('   Task:', challenge.task);

        // 2. Test Answer Evaluation
        console.log('\n🧪 Testing Answer Evaluation...');
        // Need a user ID. Let's find one or create a dummy one.
        // For test purposes, we might fail if no user exists.
        const { data: users } = await supabase.from('employees').select('id').limit(1);

        if (users && users.length > 0) {
            const userId = users[0].id;
            const response = "I would use a clear prompt with specific constraints.";
            const evaluation = await evaluateResponse(challenge.id, response, userId);
            console.log('✅ Evaluation Result:', evaluation.score);
            console.log('   Feedback:', evaluation.feedback);
        } else {
            console.warn('⚠️ No user found to test evaluation. Skipping.');
        }

    } catch (error) {
        console.error('❌ Challenge Test Failed:', error);
    }

    // 3. Test Goal Generation
    console.log('\n🧪 Testing Goal Generation...');
    try {
        const { data: users } = await supabase.from('employees').select('id').limit(1);
        if (users && users.length > 0) {
            const userId = users[0].id;
            const goals = await generateGoals('React Native', userId);
            console.log('✅ Goals Generated:', goals.length);
            goals.forEach((g: any) => console.log(`   - ${g.description}`));
        } else {
            console.warn('⚠️ No user found to test goals. Skipping.');
        }
    } catch (error) {
        console.error('❌ Goal Test Failed:', error);
    }

    console.log('\n🏁 Tests Completed.');
    process.exit(0);
};

runTests();
