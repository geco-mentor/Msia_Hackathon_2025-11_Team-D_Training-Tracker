import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(process.cwd(), '../.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- DATA DEFINITIONS ---

const BADGES: Record<string, string[]> = {
    'Sales': [
        'Top Closer', 'Negotiation Master', 'Client Hero', 'Quota Crusher', 'Pipeline Pro', 'Cold Call King', 'Deal Architect', 'Retention Rockstar'
    ],
    'Engineering': [
        'Code Ninja', 'Bug Hunter', 'Deployment Wizard', 'Hackathon Winner', 'Open Source Contributor', 'Tech Lead Material', 'Clean Coder', 'System Stabilizer'
    ],
    'Marketing': [
        'Creative Spark', 'Viral Campaign', 'Brand Guardian', 'Social Butterfly', 'Content Machine', 'Growth Hacker', 'SEO Wizard'
    ],
    'Finance': [
        'Number Cruncher', 'Audit Star', 'Fiscal Hawk', 'Spreadsheet Wizard', 'Compliance Champion', 'Budget Master'
    ],
    'HR': [
        'People Person', 'Conflict Resolver', 'Culture Champion', 'Recruiting Rockstar', 'Onboarding Hero', 'Empathy Expert'
    ],
    'Operations': [
        'Efficiency Expert', 'Process Improver', 'Logistics Legend', 'Project Pro', 'Ops Ninja'
    ],
    'IT': [
        'Ticket Terminator', 'Network Navigator', 'Hardware Hero', 'Cyber Sentinel', 'Cloud Commander'
    ]
};

const CERTIFICATES: Record<string, string[]> = {
    'Sales': [
        'Certified Sales Professional (CSP)', 'Strategic Account Management', 'Spin Selling Certified', 'Salesforce Administrator', 'HubSpot Sales Software', 'Modern Sales Methodology', 'Enterprise Selling'
    ],
    'Engineering': [
        'AWS Solutions Architect', 'Google Professional Cloud Developer', 'Certified Kubernetes Administrator (CKA)', 'Scrum Master (CSM)', 'Oracle Certified Professional', 'CISSP (Security)', 'MongoDB Certified Developer'
    ],
    'Marketing': [
        'Google Ads Search', 'Meta Media Buying Professional', 'HubSpot Content Marketing', 'SEO Fundamentals (Moz)', 'Google Analytics 4', 'Digital Marketing Institute Pro'
    ],
    'Finance': [
        'CPA (Certified Public Accountant)', 'CFA (Chartered Financial Analyst)', 'FRM (Financial Risk Manager)', 'Certified Internal Auditor', 'ACCA', 'CIMA'
    ],
    'HR': [
        'SHRM-CP', 'PHR (Professional in Human Resources)', 'Talent Management Practitioner', 'Certified Diversity Professional', 'Strategic HR Leadership'
    ],
    'Operations': [
        'Project Management Professional (PMP)', 'ITIL 4 Foundation', 'Six Sigma Green Belt', 'Lean Management Certified', 'Supply Chain Professional (CSCP)'
    ],
    'IT': [
        'CompTIA A+', 'Cisco Certified Network Associate (CCNA)', 'Microsoft Certified: Azure Fundamentals', 'Certified Ethical Hacker (CEH)', 'ITIL Foundation'
    ]
};

// --- LOGIC ---

async function assignBadgesAndCerts() {
    console.log('=== Assigning Badges & Certificates ===\n');

    const { data: employees, error } = await supabase
        .from('employees')
        .select('id, name, role, department');

    if (error || !employees) {
        console.error('Error fetching employees:', error);
        return;
    }

    console.log(`Found ${employees.length} employees.`);

    let updatedCount = 0;

    for (const emp of employees) {
        const dept = emp.department || 'Unknown';
        // Normalize role to lowercase for checking
        const role = (emp.role || '').toLowerCase();

        let certCount = 0;
        let badgeCount = 0;

        // 1. Determine Count based on Seniority
        if (role.includes('lead') || role.includes('senior') || role.includes('head') || role.includes('manager') || role.includes('architect') || role.includes('director') || role.includes('vp')) {
            // Senior/Lead: High count
            certCount = Math.floor(Math.random() * 3) + 2; // 2-4 certs
            badgeCount = Math.floor(Math.random() * 4) + 2; // 2-5 badges
        } else if (role.includes('mid') || role.includes('specialist') || role.includes('analyst') || role.includes('consultant')) {
            // Mid: Medium count
            certCount = Math.floor(Math.random() * 2) + 1; // 1-2 certs
            badgeCount = Math.floor(Math.random() * 3) + 1; // 1-3 badges
        } else {
            // Junior/Associate/Intern: Low count
            // 70% chance to have 0-1, 30% chance to have none
            if (Math.random() > 0.3) {
                certCount = Math.floor(Math.random() * 2); // 0-1 certs
                badgeCount = Math.floor(Math.random() * 2) + 1; // 1-2 badges (easy to get badges)
            } else {
                certCount = 0;
                badgeCount = 0;
            }
        }

        // 2. Pick Items
        const possibleCerts = CERTIFICATES[dept] || CERTIFICATES['Operations']; // Fallback
        const possibleBadges = BADGES[dept] || BADGES['Operations']; // Fallback

        // Shuffle and slice helper
        const pickRandom = (arr: string[], n: number) => {
            if (!arr) return [];
            const shuffled = [...arr].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, n);
        };

        const assignedCerts = pickRandom(possibleCerts, certCount);
        const assignedBadges = pickRandom(possibleBadges, badgeCount);

        // 3. Update Database
        // Note: Assuming 'certificates' and 'badges' are JSONB or Text array columns.
        // If they are JSONB, we send array object.

        const { error: updateError } = await supabase
            .from('employees')
            .update({
                certificates: assignedCerts,
                badges: assignedBadges
            })
            .eq('id', emp.id);

        if (updateError) {
            console.error(`Failed to update ${emp.name} (${emp.role}):`, updateError.message);
        } else {
            updatedCount++;
            // Log some examples
            if (Math.random() < 0.1) {
                console.log(`Updated ${emp.name} (${dept} - ${emp.role}):`);
                console.log(`   Certs: ${assignedCerts.join(', ')}`);
                console.log(`   Badges: ${assignedBadges.join(', ')}`);
            }
        }
    }

    console.log(`\nSuccessfully updated ${updatedCount} employees.`);
}

assignBadgesAndCerts().catch(console.error);
