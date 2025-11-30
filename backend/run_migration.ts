import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env from root directory
const envPath = path.join(__dirname, '../.env');
console.log('Loading .env from:', envPath);

const result = dotenv.config({ path: envPath });
if (result.error) {
    console.error('Error loading .env:', result.error);
} else {
    console.log('.env loaded successfully');
}

async function runMigration() {
    console.log('Loading migration file...');
    const migrationPath = path.join(__dirname, 'migration_jobs_and_departments.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Connecting to database...');
    // Debug: Check specific keys
    console.log('SUPABASE_DB_URL exists:', !!process.env.SUPABASE_DB_URL);
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

    // Try to find DATABASE_URL
    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

    if (!connectionString) {
        console.error('Error: DATABASE_URL or SUPABASE_DB_URL not found in environment variables.');
        process.exit(1);
    }

    const client = new Client({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected. Running migration...');
        await client.query(migrationSql);
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
