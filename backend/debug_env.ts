import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.join(__dirname, '../.env');
console.log('TS: Looking for .env at:', envPath);

if (fs.existsSync(envPath)) {
    console.log('TS: .env file exists');
    const result = dotenv.config({ path: envPath });
    if (result.error) {
        console.error('TS: Error loading .env:', result.error);
    } else {
        console.log('TS: .env loaded successfully');
        console.log('TS: SUPABASE_DB_URL exists:', !!process.env.SUPABASE_DB_URL);
    }
} else {
    console.error('TS: .env file NOT found');
}
