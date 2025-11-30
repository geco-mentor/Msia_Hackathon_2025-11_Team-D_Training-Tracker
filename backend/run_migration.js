const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from root directory
const envPath = path.join(__dirname, '../.env');
console.log('Loading .env from:', envPath);

// Try standard dotenv load first
dotenv.config({ path: envPath });

async function runMigration() {
    console.log('Loading migration file...');
    const migrationPath = path.join(__dirname, 'migration_jobs_and_departments.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Connecting to database...');

    // Try to find DATABASE_URL or SUPABASE_DB_URL from process.env
    let connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

    // Fallback: Manually construct from SUPABASE_URL and database_password
    if (!connectionString) {
        console.log('Fallback: Constructing connection string manually...');
        try {
            const envContent = fs.readFileSync(envPath, 'utf8');

            // Extract SUPABASE_URL and database_password
            const urlMatch = envContent.match(/SUPABASE_URL\s*=\s*(.+)/);
            const passMatch = envContent.match(/database_password\s*=\s*(.+)/);

            if (urlMatch && urlMatch[1] && passMatch && passMatch[1]) {
                let supabaseUrl = urlMatch[1].trim();
                let password = passMatch[1].trim();

                // Remove quotes
                if (supabaseUrl.startsWith('"')) supabaseUrl = supabaseUrl.slice(1, -1);
                if (supabaseUrl.startsWith("'")) supabaseUrl = supabaseUrl.slice(1, -1);
                if (password.startsWith('"')) password = password.slice(1, -1);
                if (password.startsWith("'")) password = password.slice(1, -1);

                // Extract project ref from URL (https://[ref].supabase.co)
                const refMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
                if (refMatch && refMatch[1]) {
                    const projectRef = refMatch[1];
                    // Construct connection string
                    connectionString = `postgres://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;
                    console.log('Constructed connection string manually.');
                } else {
                    console.log('Could not extract project ref from SUPABASE_URL');
                }
            } else {
                console.log('Could not find SUPABASE_URL or database_password in .env');
            }
        } catch (e) {
            console.error('Manual construction failed:', e);
        }
    }

    if (!connectionString) {
        console.error('Error: Could not determine database connection string.');
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
