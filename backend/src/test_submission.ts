import { evaluateResponse } from './services/challengeService';
import { supabase } from './config/database';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function test() {
    console.log('Starting submission test...');

    try {
        // 1. Get a user
        const { data: user, error: userError } = await supabase
            .from('employees')
            .select('id')
            .limit(1)
            .single();

        if (userError || !user) {
            console.error('Failed to get a user for testing:', userError);
            return;
        }
        console.log(`Using user ID: ${user.id}`);

        // 2. Get a scenario
        const { data: scenario, error: scenarioError } = await supabase
            .from('scenarios')
            .select('id, task')
            .limit(1)
            .single();

        if (scenarioError || !scenario) {
            console.error('Failed to get a scenario for testing:', scenarioError);
            return;
        }
        console.log(`Using scenario ID: ${scenario.id}`);
        console.log(`Task: ${scenario.task}`);

        // 3. Submit a response
        const dummyResponse = "This is a test response to verify the backend fix. I am clarifying the prompt as requested.";
        console.log(`Submitting response: "${dummyResponse}"`);

        const result = await evaluateResponse(scenario.id, dummyResponse, user.id);

        console.log('---------------------------------------------------');
        console.log('SUCCESS! Evaluation Result:');
        console.log(JSON.stringify(result, null, 2));
        console.log('---------------------------------------------------');

    } catch (error: any) {
        console.error('TEST FAILED:');
        console.error(error);
    }
}

test();
