#!/usr/bin/env node

/**
 * Enhanced Development Startup Script
 * 
 * This script:
 * 1. Checks and refreshes AWS tokens if needed
 * 2. Tests database connectivity
 * 3. Starts backend and frontend servers
 * 4. Automatically opens browser to localhost:5173
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { existsSync } from 'fs';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3001';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
    log(`\n${colors.bright}[${step}]${colors.reset} ${message}`);
}

function logSuccess(message) {
    log(`  ✅ ${message}`, colors.green);
}

function logError(message) {
    log(`  ❌ ${message}`, colors.red);
}

function logWarning(message) {
    log(`  ⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
    log(`  ℹ️  ${message}`, colors.cyan);
}

// Step 1: Check and refresh AWS tokens
async function checkAndRefreshAWSTokens() {
    logStep('1/4', 'Checking AWS Tokens...');

    const refTokenPath = join(__dirname, 'refToken.py');

    if (!existsSync(refTokenPath)) {
        logInfo('refToken.py not found - skipping AWS token refresh');
        return;
    }

    try {
        // Try different Python commands
        const pythonCommands = ['python', 'python3', 'py'];
        let pythonCmd = null;

        for (const cmd of pythonCommands) {
            try {
                await execAsync(`${cmd} --version`, { timeout: 3000 });
                pythonCmd = cmd;
                break;
            } catch (e) {
                // Continue to next command
            }
        }

        if (!pythonCmd) {
            logWarning('Python not found in PATH');
            logInfo('Skipping AWS token refresh');
            return;
        }

        logInfo(`Using ${pythonCmd} to refresh tokens...`);

        const { stdout, stderr } = await execAsync(`${pythonCmd} refToken.py`, {
            cwd: __dirname,
            timeout: 30000
        });

        if (stdout && stdout.trim()) {
            console.log(stdout.trim());
        }
        if (stderr && stderr.trim()) {
            console.error(stderr.trim());
        }
        logSuccess('AWS token check completed');

    } catch (error) {
        if (error.message.includes('timeout')) {
            logWarning('AWS token refresh timed out');
        } else {
            logWarning('AWS token refresh had issues');
        }
        logInfo('Continuing with startup...');
    }
}

// Step 2: Test database connectivity
async function testDatabaseConnectivity() {
    logStep('2/4', 'Testing Database Connectivity...');

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        logError('Missing SUPABASE_URL or SUPABASE_KEY in .env file');
        process.exit(1);
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
            .from('employees')
            .select('count')
            .limit(1);

        if (error && error.code !== 'PGRST116') {
            logError(`Database connection failed: ${error.message}`);
            process.exit(1);
        }

        logSuccess('Database connection successful');

        const { data: admins } = await supabase
            .from('admins')
            .select('username')
            .limit(1);

        if (admins && admins.length > 0) {
            logSuccess(`Admin user exists (${admins.length} admin(s) found)`);
        } else {
            logWarning('No admin user found - run database schema SQL');
        }

    } catch (error) {
        logError(`Database test failed: ${error.message}`);
        process.exit(1);
    }
}

// Step 3: Start servers
async function startServers() {
    logStep('3/4', 'Starting Backend and Frontend Servers...');

    return new Promise((resolve) => {
        const serverProcess = spawn('npx', ['concurrently',
            '"npm run dev:backend"',
            '"npm run dev:frontend"'
        ], {
            cwd: __dirname,
            shell: true,
            stdio: 'inherit'
        });

        setTimeout(() => {
            logSuccess('Servers starting...');
            logInfo(`Backend: ${BACKEND_URL}`);
            logInfo(`Frontend: ${FRONTEND_URL}`);
            resolve(serverProcess);
        }, 3000);

        serverProcess.on('error', (error) => {
            logError(`Failed to start servers: ${error.message}`);
            process.exit(1);
        });
    });
}

// Step 4: Open browser
async function openBrowser() {
    logStep('4/4', 'Opening Browser...');

    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
        const platform = process.platform;
        let command;

        if (platform === 'win32') {
            command = `start ${FRONTEND_URL}`;
        } else if (platform === 'darwin') {
            command = `open ${FRONTEND_URL}`;
        } else {
            command = `xdg-open ${FRONTEND_URL}`;
        }

        await execAsync(command);
        logSuccess(`Browser opened at ${FRONTEND_URL}`);
    } catch (error) {
        logWarning('Could not automatically open browser');
        logInfo(`Please manually open: ${FRONTEND_URL}`);
    }
}

// Main startup sequence
async function main() {
    console.clear();
    log('\n' + '='.repeat(60), colors.magenta);
    log('  🚀  AI TRAINING TRACKER - DEVELOPMENT STARTUP', colors.bright + colors.magenta);
    log('='.repeat(60) + '\n', colors.magenta);

    try {
        await checkAndRefreshAWSTokens();
        await testDatabaseConnectivity();
        const serverProcess = await startServers();
        await openBrowser();

        log('\n' + '='.repeat(60), colors.green);
        log('  ✅  ALL SYSTEMS READY!', colors.bright + colors.green);
        log('='.repeat(60), colors.green);
        log(`\n  ${colors.cyan}Frontend:${colors.reset} ${FRONTEND_URL}`);
        log(`  ${colors.cyan}Backend:${colors.reset}  ${BACKEND_URL}`);
        log(`\n  ${colors.yellow}Press Ctrl+C to stop all servers${colors.reset}\n`);

        process.on('SIGINT', () => {
            log('\n\n' + '='.repeat(60), colors.yellow);
            log('  🛑  Shutting down servers...', colors.yellow);
            log('='.repeat(60), colors.yellow);
            serverProcess.kill();
            process.exit(0);
        });

    } catch (error) {
        logError(`Startup failed: ${error.message}`);
        process.exit(1);
    }
}

main();
