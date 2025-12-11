
import { supabase } from './backend/src/config/database';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const checkEngineeringData = async () => {
    try {
        console.log('Checking Engineering data...');

        // Get Engineering employees
        const { data: employees, error: empError } = await supabase
            .from('employees')
            .select('id, name')
            .eq('department', 'Engineering');

        if (empError) {
            console.error('Error fetching employees:', empError);
            return;
        }

        console.log(`Found ${employees?.length} Engineering employees.`);
        if (!employees || employees.length === 0) return;

        const empIds = employees.map(e => e.id);

        // Check assessments for these employees
        const { count, error: countError } = await supabase
            .from('assessments')
            .select('*', { count: 'exact', head: true })
            .in('user_id', empIds)
            .eq('completed', true);

        if (countError) {
            console.error('Error fetching assessments:', countError);
            return;
        }

        console.log(`Total completed assessments for Engineering: ${count}`);

    } catch (err) {
        console.error('Unexpected error:', err);
    }
};

checkEngineeringData();
