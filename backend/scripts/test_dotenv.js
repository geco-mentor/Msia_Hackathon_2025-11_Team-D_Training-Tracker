const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve('c:/Users/M S I/Documents/GitProject/ai-hackathon/.env');
console.log('Testing .env path:', envPath);

if (fs.existsSync(envPath)) {
    console.log('.env file EXISTS.');
    const result = dotenv.config({ path: envPath });
    if (result.error) {
        console.error('dotenv error:', result.error);
    } else {
        console.log('.env loaded.');
        console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'FOUND' : 'MISSING');
        console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'FOUND' : 'MISSING');
    }
} else {
    console.error('.env file NOT FOUND.');
}
