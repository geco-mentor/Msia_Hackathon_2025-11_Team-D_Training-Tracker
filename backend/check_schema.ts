import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking scenarios table schema...");
    // We can't directly query information_schema easily with supabase-js, 
    // but we can try to select one row and see the keys, 
    // or try to insert a dummy row with the new fields and see if it fails.

    // Let's try to select * limit 1
    const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error selecting from scenarios:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Existing columns based on first row:");
        console.log(Object.keys(data[0]));
    } else {
        console.log("Table is empty, cannot infer columns from data.");
        // Try an insert that should fail but reveal schema info? 
        // Or just assume if it's empty we can't check easily without SQL editor.
        // Actually, we can use rpc if we had a function, but we don't.
    }
}

checkSchema();
