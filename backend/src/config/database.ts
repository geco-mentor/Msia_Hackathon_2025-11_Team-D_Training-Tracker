import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_KEY in environment variables');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Test connection
export async function testConnection(): Promise<boolean> {
    try {
        const { error } = await supabase.from('employees').select('count').limit(1);
        if (error) {
            console.error('Database connection error:', error.message);
            return false;
        }
        console.log('✅ Database connection successful');
        return true;
    } catch (err) {
        console.error('Database connection failed:', err);
        return false;
    }
}
