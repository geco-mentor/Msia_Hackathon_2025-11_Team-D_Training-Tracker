const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '../.env');
console.log('Looking for .env at:', envPath);

if (fs.existsSync(envPath)) {
    console.log('.env file exists');
    const result = dotenv.config({ path: envPath });
    if (result.error) {
        console.error('Error loading .env:', result.error);
    } else {
        console.log('.env loaded successfully');
        console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
        console.log('SUPABASE_DB_URL exists:', !!process.env.SUPABASE_DB_URL);
    }
} else {
    console.error('.env file NOT found');
}
