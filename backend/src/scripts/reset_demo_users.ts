/**
 * Demo User Reset Script
 * 
 * This script resets 5 demo users to a known state for testing purposes:
 * - John: New engineer (little experience, needs training)
 * - Louis: 5 years experience (wants to become SME)
 * - Eve: 8 years experience (wants management)
 * - Adam: HR/Learning Admin
 * - Daniel: Team Lead/Manager
 * 
 * All passwords: TrialEmployee
 * 
 * Run: cd backend && npx ts-node src/scripts/reset_demo_users.ts
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'TrialEmployee';

// User configurations
interface DemoEmployee {
    username: string;
    name: string;
    employee_id: string;
    department: string;
    job_title: string;
    job_description: string;
    is_manager: boolean;
    elo_rating: number;
    win_rate: number;
    streak: number;
    total_points: number;
    ranking: number;
    assessmentCount: number;
    personalizedAssessmentCount: number;
    assessmentScoreRange: [number, number];
    certifications: { name: string; issuer: string; yearsAgo: number }[];
    careerGoal: { title: string; description: string; timeframe: string } | null;
    skillMastery?: Record<string, string>;
}

const DEMO_EMPLOYEES: DemoEmployee[] = [
    {
        username: 'John',
        name: 'John',
        employee_id: 'DEMO-001',
        department: 'Engineering',
        job_title: 'Junior Engineer',
        job_description: 'New engineer focused on learning core skills and growing expertise.',
        is_manager: false,
        // Stats for a new engineer (0-1 year experience)
        elo_rating: 920,
        win_rate: 0.35,
        streak: 0,
        total_points: 180,
        ranking: 0,
        // Synthetic data config
        assessmentCount: 6, // Slightly more to cover all skills
        personalizedAssessmentCount: 0,
        assessmentScoreRange: [40, 65],
        certifications: [],
        careerGoal: null,
        skillMastery: {
            'Software Development': 'Medium', // Junior - learning but not expert yet
            'Generative AI': 'Low',
            'Cybersecurity Awareness': 'Low',
            'Risk Management': 'Low',
            'Business Operations': 'Low',
            'Sales Strategy': 'Low'
        }
    },
    {
        username: 'Louis',
        name: 'Louis',
        employee_id: 'DEMO-002',
        department: 'Engineering',
        job_title: 'Mid-Level Engineer',
        job_description: 'Experienced engineer with solid skills looking to become a Subject Matter Expert.',
        is_manager: false,
        // Stats for 5 years experience
        elo_rating: 1250,
        win_rate: 0.62,
        streak: 3,
        total_points: 2100,
        ranking: 0,
        // Synthetic data config
        assessmentCount: 18,
        personalizedAssessmentCount: 5,
        assessmentScoreRange: [70, 92],
        certifications: [], // Removed - was making everyone SW Dev expert
        careerGoal: {
            title: 'Become a Subject Matter Expert',
            description: 'Develop deep expertise in cloud architecture and become the go-to person for complex technical decisions.',
            timeframe: '2 years'
        },
        skillMastery: {
            'Software Development': 'High',
            'Generative AI': 'Medium', // Good but not expert
            'Cybersecurity Awareness': 'Medium', // Aware but not specialist
            'Risk Management': 'Low',
            'Business Operations': 'Low',
            'Sales Strategy': 'Low'
        }
    },
    {
        username: 'Eve',
        name: 'Eve',
        employee_id: 'DEMO-003',
        department: 'Engineering',
        job_title: 'Senior Engineer',
        job_description: 'Highly experienced engineer with leadership aspirations and strong technical foundation.',
        is_manager: false,
        // Stats for 8 years experience
        elo_rating: 1420,
        win_rate: 0.78,
        streak: 5,
        total_points: 4200,
        ranking: 0,
        // Synthetic data config
        assessmentCount: 32,
        personalizedAssessmentCount: 15,
        assessmentScoreRange: [82, 97],
        certifications: [
            { name: 'Certified Scrum Master (CSM)', issuer: 'Scrum Alliance', yearsAgo: 4 } // Only leadership cert, not tech
        ],
        careerGoal: {
            title: 'Transition to Engineering Manager',
            description: 'Develop leadership skills and transition into a management role overseeing a team of engineers.',
            timeframe: '1 year'
        },
        skillMastery: {
            'Software Development': 'High',
            'Generative AI': 'Medium', // Uses it but not researcher level
            'Cybersecurity Awareness': 'Low',
            'Risk Management': 'Medium', // Some project risk awareness
            'Business Operations': 'Low',
            'Sales Strategy': 'Low'
        }
    },
    {
        username: 'Daniel',
        name: 'Daniel',
        employee_id: 'DEMO-004',
        department: 'Engineering',
        job_title: 'Engineering Manager',
        job_description: 'Team Lead overseeing the Engineering department and tracking team skill progression.',
        is_manager: true,
        // Stats for a manager
        elo_rating: 1350,
        win_rate: 0.72,
        streak: 4,
        total_points: 3200,
        ranking: 0,
        // Synthetic data config
        assessmentCount: 25,
        personalizedAssessmentCount: 2,
        assessmentScoreRange: [75, 94],
        certifications: [
            { name: 'Project Management Professional (PMP)', issuer: 'PMI', yearsAgo: 3 } // Only PMP, not tech
        ],
        careerGoal: {
            title: 'Lead High-Performing Teams',
            description: 'Build and mentor a high-performing engineering team that consistently delivers quality work.',
            timeframe: '2 years'
        },
        skillMastery: {
            'Software Development': 'Medium', // Manager - less hands-on coding
            'Generative AI': 'Low',
            'Cybersecurity Awareness': 'Low',
            'Risk Management': 'Medium', // Some risk awareness
            'Business Operations': 'Medium', // Learning management skills
            'Sales Strategy': 'Low'
        }
    },
    {
        username: 'Sarah',
        name: 'Sarah',
        employee_id: 'DEMO-005',
        department: 'Engineering',
        job_title: 'Unreal Engine Developer',
        job_description: 'Creative developer specializing in 3D graphics and immersive experiences.',
        is_manager: false,
        elo_rating: 1180,
        win_rate: 0.65,
        streak: 2,
        total_points: 1540,
        ranking: 0,
        assessmentCount: 12,
        personalizedAssessmentCount: 2,
        assessmentScoreRange: [65, 88],
        certifications: [], // Graphics dev, no standard IT certs
        careerGoal: { title: 'Lead Graphics Engineer', description: 'Spearhead the new VR training module development.', timeframe: '3 years' },
        skillMastery: {
            'Software Development': 'Medium', // Game dev is specialized, not general
            'Generative AI': 'Low',
            'Cybersecurity Awareness': 'Low',
            'Risk Management': 'Low',
            'Business Operations': 'Low',
            'Sales Strategy': 'Low'
        }
    },
    {
        username: 'Mike',
        name: 'Mike',
        employee_id: 'DEMO-006',
        department: 'Engineering',
        job_title: 'DevSecOps Specialist',
        job_description: 'Ensuring the security and scalability of the training platform infrastructure.',
        is_manager: false,
        elo_rating: 1310,
        win_rate: 0.70,
        streak: 5,
        total_points: 2900,
        ranking: 0,
        assessmentCount: 20,
        personalizedAssessmentCount: 4,
        assessmentScoreRange: [72, 95],
        certifications: [
            { name: 'Certified Information Systems Security Professional (CISSP)', issuer: 'ISC2', yearsAgo: 2 } // Keep security cert for Mike only
        ],
        careerGoal: { title: 'Chief Information Security Officer (CISO)', description: 'Lead the organization\'s entire security strategy.', timeframe: '5 years' },
        skillMastery: {
            'Software Development': 'Low',
            'Generative AI': 'Low',
            'Cybersecurity Awareness': 'High', // This is Mike's specialty
            'Risk Management': 'Medium', // Security-related risk
            'Business Operations': 'Low',
            'Sales Strategy': 'Low'
        }
    },
    {
        username: 'Jessica',
        name: 'Jessica',
        employee_id: 'DEMO-007',
        department: 'Engineering',
        job_title: 'QA Automation Engineer',
        job_description: 'Building automated test suites to ensure platform reliability.',
        is_manager: false,
        elo_rating: 1150,
        win_rate: 0.55,
        streak: 1,
        total_points: 1200,
        ranking: 0,
        assessmentCount: 15,
        personalizedAssessmentCount: 1,
        assessmentScoreRange: [60, 85],
        certifications: [], // QA cert doesn't match our skill keywords
        careerGoal: { title: 'QA Lead', description: 'Establish best-in-class testing protocols for the engineering team.', timeframe: '2 years' },
        skillMastery: {
            'Software Development': 'Medium', // Scripting for tests
            'Generative AI': 'Low',
            'Cybersecurity Awareness': 'Low',
            'Risk Management': 'Medium', // QA understands some risk
            'Business Operations': 'Low',
            'Sales Strategy': 'Low'
        }
    },
    {
        username: 'David',
        name: 'David',
        employee_id: 'DEMO-008',
        department: 'Engineering',
        job_title: 'Backend Intern',
        job_description: 'Aspiring backend engineer currently rotating through different teams.',
        is_manager: false,
        elo_rating: 880,
        win_rate: 0.25,
        streak: 0,
        total_points: 400,
        ranking: 0,
        assessmentCount: 8,
        personalizedAssessmentCount: 0,
        assessmentScoreRange: [30, 60],
        certifications: [],
        careerGoal: { title: 'Junior Backend Engineer', description: 'Secure a full-time position in the backend team.', timeframe: '6 months' },
        skillMastery: {
            'Software Development': 'Low',
            'Generative AI': 'Low',
            'Cybersecurity Awareness': 'Low',
            'Risk Management': 'Low',
            'Business Operations': 'Low',
            'Sales Strategy': 'Low'
        }
    },
    {
        username: 'Emily',
        name: 'Emily',
        employee_id: 'DEMO-009',
        department: 'Engineering',
        job_title: 'AI Research Scientist',
        job_description: 'Pushing the boundaries of what our training AI can do.',
        is_manager: false,
        elo_rating: 1450,
        win_rate: 0.82,
        streak: 8,
        total_points: 4500,
        ranking: 0,
        assessmentCount: 22,
        personalizedAssessmentCount: 10,
        assessmentScoreRange: [85, 99],
        certifications: [{ name: 'PhD in Computer Science', issuer: 'MIT', yearsAgo: 1 }],
        careerGoal: { title: 'Principal Investigator', description: 'Lead a dedicated AI research lab within the company.', timeframe: '4 years' },
        skillMastery: {
            'Software Development': 'Medium', // Research focused, not product dev
            'Generative AI': 'High', // Emily is the AI expert - ONLY ONE
            'Cybersecurity Awareness': 'Low',
            'Risk Management': 'Low',
            'Business Operations': 'Low',
            'Sales Strategy': 'Low'
        }
    }
];

const DEMO_ADMIN = {
    username: 'Adam',
    name: 'Adam',
    password: DEFAULT_PASSWORD
};

// Helper functions
const daysAgo = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
};

const randomInRange = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const PRACTICE_TOPICS = [
    'Advanced React Patterns', 'Kubernetes Networking', 'Database Optimization',
    'GraphQL Schema Design', 'Microservices Architecture', 'System Design Interviews',
    'CI/CD Pipelines', 'Cloud Security Best Practices', 'TypeScript Generics'
];

async function deleteExistingUsers(): Promise<void> {
    console.log('\n🗑️  STEP 1: Deleting existing demo users...');

    const employeeUsernames = DEMO_EMPLOYEES.map(e => e.username);
    const adminUsername = DEMO_ADMIN.username;

    // Get employee IDs first
    const { data: existingEmployees } = await supabase
        .from('employees')
        .select('id, username')
        .in('username', employeeUsernames);

    if (existingEmployees && existingEmployees.length > 0) {
        const employeeIds = existingEmployees.map(e => e.id);

        console.log(`   Found ${existingEmployees.length} existing demo employees. Cleaning up...`);

        // Get scenarios created by these employees to clean them up too
        const { data: userScenarios } = await supabase
            .from('scenarios')
            .select('id')
            .in('creator_id', employeeIds);

        const userScenarioIds = userScenarios?.map(s => s.id) || [];

        // Delete assessments (linked to users)
        await supabase.from('assessments').delete().in('user_id', employeeIds);

        // Delete assessments (linked to user scenarios - if any other users took them)
        if (userScenarioIds.length > 0) {
            await supabase.from('assessments').delete().in('scenario_id', userScenarioIds);
        }

        // Delete certifications
        await supabase.from('employee_certifications').delete().in('user_id', employeeIds);

        // Delete career goals
        await supabase.from('employee_career_goals').delete().in('user_id', employeeIds);

        // Delete pre_assessments
        await supabase.from('pre_assessments').delete().in('user_id', employeeIds);

        // Delete course ratings
        await supabase.from('course_ratings').delete().in('user_id', employeeIds);

        // Delete personal scenarios created by these users
        if (userScenarioIds.length > 0) {
            await supabase.from('scenarios').delete().in('id', userScenarioIds);
        }

        // Delete goals
        await supabase.from('goals').delete().in('user_id', employeeIds);

        // Now delete employees
        const { error: empDeleteError } = await supabase
            .from('employees')
            .delete()
            .in('username', employeeUsernames);

        if (empDeleteError) {
            console.error('   ❌ Error deleting employees:', empDeleteError.message);
        } else {
            console.log(`   ✅ Deleted ${existingEmployees.length} demo employees and their related data.`);
        }
    } else {
        console.log('   No existing demo employees found.');
    }

    // Delete admin
    const { error: adminDeleteError } = await supabase
        .from('admins')
        .delete()
        .eq('username', adminUsername);

    if (adminDeleteError) {
        console.error('   ❌ Error deleting admin:', adminDeleteError.message);
    } else {
        console.log('   ✅ Deleted existing admin (Adam) if he existed.');
    }
}

async function createEmployees(): Promise<Map<string, string>> {
    console.log('\n👥 STEP 2: Creating demo employees...');

    const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
    const userIdMap = new Map<string, string>();

    for (const emp of DEMO_EMPLOYEES) {
        console.log(`   Creating ${emp.username} (${emp.job_title})...`);

        const { data, error } = await supabase
            .from('employees')
            .insert({
                name: emp.name,
                username: emp.username,
                employee_id: emp.employee_id,
                password_hash,
                job_title: emp.job_title,
                department: emp.department,
                job_description: emp.job_description,
                is_manager: emp.is_manager,
                elo_rating: emp.elo_rating,
                win_rate: emp.win_rate,
                streak: emp.streak,
                total_points: emp.total_points,
                ranking: emp.ranking,
                skills_profile: {}
            })
            .select('id')
            .single();

        if (error) {
            console.error(`   ❌ Failed to create ${emp.username}:`, error.message);
        } else {
            console.log(`   ✅ Created ${emp.username} with ID: ${data.id}`);
            userIdMap.set(emp.username, data.id);
        }
    }

    return userIdMap;
}

async function createAdmin(): Promise<void> {
    console.log('\n🔐 STEP 3: Creating demo admin (Adam)...');

    const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

    const { error } = await supabase
        .from('admins')
        .insert({
            name: DEMO_ADMIN.name,
            username: DEMO_ADMIN.username,
            password_hash
        });

    if (error) {
        console.error('   ❌ Failed to create admin:', error.message);
    } else {
        console.log('   ✅ Created admin Adam (HR/Learning Team).');
    }
}

async function generateAssessmentHistory(userIdMap: Map<string, string>): Promise<void> {
    console.log('\n📊 STEP 4: Generating assessment history (Standard & Personal)...');

    // Get all standard scenarios
    const { data: scenarios, error: scenarioError } = await supabase
        .from('scenarios')
        .select('id, title, skill, difficulty')
        .eq('is_personalized', false); // Only use standard ones for standard history

    if (scenarioError || !scenarios || scenarios.length === 0) {
        console.error('   ❌ Could not fetch standard scenarios:', scenarioError?.message);
        // Continue but standard assessments might fail
    }

    for (const emp of DEMO_EMPLOYEES) {
        const userId = userIdMap.get(emp.username);
        if (!userId) continue;

        console.log(`   Processing ${emp.username}...`);

        const [minScore, maxScore] = emp.assessmentScoreRange;
        const insertBatch = [];
        let assessmentsGenerated = 0;

        // 4.1 Create Standard Assessments with Skill Mastery Logic
        if (scenarios && scenarios.length > 0) {

            // 1. Generate ensure-mastery assessments first
            if (emp.skillMastery) {
                for (const [skill, level] of Object.entries(emp.skillMastery)) {
                    // Fuzzy match scenarios to this skill
                    const matchingScenarios = scenarios.filter(s =>
                        (s.skill && s.skill.toLowerCase().includes(skill.toLowerCase())) ||
                        (s.skill && skill.toLowerCase().includes(s.skill.toLowerCase())) ||
                        s.title.toLowerCase().includes(skill.toLowerCase())
                    );

                    if (matchingScenarios.length > 0) {
                        // Pick one to assess
                        const scenario = matchingScenarios[Math.floor(Math.random() * matchingScenarios.length)];

                        // Determine score based on mastery level
                        // High: 75-95 (Expert, >= 70 threshold), Medium: 50-68 (Not expert), Low: 30-55 (Fail)
                        const score = level === 'High'
                            ? randomInRange(75, 95)
                            : level === 'Medium'
                                ? randomInRange(50, 68) // Below 70 expert threshold
                                : randomInRange(30, 55);

                        insertBatch.push({
                            user_id: userId,
                            scenario_id: scenario.id,
                            score,
                            difficulty: scenario.difficulty || 'Medium',
                            feedback: JSON.stringify({
                                strengths: level === 'High' ? ['Mastered core concepts'] : level === 'Medium' ? ['Good progress'] : [],
                                weaknesses: level === 'Low' ? ['Needs practice'] : level === 'Medium' ? ['Room for improvement'] : []
                            }),
                            created_at: daysAgo(randomInRange(1, 300)),
                            user_response: 'Simulated Response',
                            completed: true
                        });
                        assessmentsGenerated++;
                    }
                }
            }

            console.log(`      Generated ${assessmentsGenerated} mastery-based assessments...`);

            // 2. Fill the rest with random assessments
            while (assessmentsGenerated < emp.assessmentCount) {
                const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

                // Use default range for randoms
                let baseScore = randomInRange(minScore, maxScore);

                // Check explicit mastery map (Fuzzy Match)
                if (emp.skillMastery && scenario.skill) {
                    const sSkill = scenario.skill.toLowerCase();
                    const matchedKey = Object.keys(emp.skillMastery).find(k =>
                        k.toLowerCase().includes(sSkill) || sSkill.includes(k.toLowerCase())
                    );

                    if (matchedKey) {
                        const masteryLevel = emp.skillMastery[matchedKey];
                        if (masteryLevel === 'Low') {
                            baseScore = randomInRange(30, 55);
                        } else if (masteryLevel === 'Medium') {
                            baseScore = randomInRange(50, 68); // Below 70 expert threshold
                        }
                        // High uses the employee's default range (which should be high enough)
                    }
                }

                const score = Math.min(100, baseScore);

                // Date logic
                const timeSpanDays = emp.username === 'John' ? 30 : 700;
                const daysFromNow = Math.floor(timeSpanDays * (1 - (assessmentsGenerated / emp.assessmentCount)));

                insertBatch.push({
                    user_id: userId,
                    scenario_id: scenario.id,
                    score,
                    difficulty: scenario.difficulty || 'Medium',
                    feedback: JSON.stringify(
                        emp.username === 'John' ? {
                            strengths: [
                                'Strong grasp of foundational concepts',
                                'Consistent code quality',
                                'Good adherence to security best practices'
                            ],
                            weaknesses: [
                                'Needs more practice with advanced patterns',
                                'Could improve error handling robustness',
                                'Documentation detailed but could be more concise'
                            ],
                            recommendations: [
                                'Review the "Advanced Design Patterns" module',
                                'Practice writing comprehensive unit tests',
                                'Explore optimization techniques for large datasets'
                            ]
                        } : {
                            strengths: [],
                            weaknesses: []
                        }
                    ),
                    created_at: daysAgo(daysFromNow),
                    user_response: 'Standard Assessment Response',
                    completed: true
                });
                assessmentsGenerated++;
            }
        }

        // 4.2 Create PERSONALIZED Scenarios & Assessments
        if (emp.personalizedAssessmentCount > 0) {
            console.log(`      Generating ${emp.personalizedAssessmentCount} personalized scenarios & assessments...`);

            for (let i = 0; i < emp.personalizedAssessmentCount; i++) {
                const topic = PRACTICE_TOPICS[i % PRACTICE_TOPICS.length];

                // 1. Create the personalized scenario first
                const { data: pScenario, error: pError } = await supabase
                    .from('scenarios')
                    .insert({
                        title: `Personalized Practice for ${emp.name}: ${topic} (Vol. ${i + 1})`,
                        category: 'Personalized',
                        skill: 'Tech Stack',
                        difficulty: 'Hard',
                        scenario_text: `This is a personalized scenario generated for ${emp.name} focusing on ${topic}.`,
                        task: `Analyze the provided scenario regarding ${topic} and call out three potential issues.`,
                        type: 'text',
                        rubric: {
                            criteria: [
                                { name: 'Relevance', description: 'Did you address the core issue?', weight: 5 },
                                { name: 'Clarity', description: 'Is your answer easy to understand?', weight: 3 },
                                { name: 'Depth', description: 'Did you provide enough detail?', weight: 2 }
                            ]
                        },
                        is_personalized: true,
                        creator_id: userId,
                        status: 'published'
                    })
                    .select('id')
                    .single();

                if (pError || !pScenario) {
                    console.error('      ❌ Failed to create personalized scenario:', pError?.message);
                    continue;
                }

                // 2. Add assessment for this specific personalized scenario
                const baseScore = randomInRange(minScore, maxScore);
                const score = Math.min(100, baseScore + 5); // Slightly better at personalized stuff

                // Recent date
                const daysFromNow = randomInRange(1, 30);

                insertBatch.push({
                    user_id: userId,
                    scenario_id: pScenario.id,
                    score,
                    difficulty: 'Hard',
                    feedback: JSON.stringify({ strengths: ['Great personalized work'], weaknesses: [] }),
                    created_at: daysAgo(daysFromNow),
                    user_response: 'Personalized Assessment Response',
                    completed: true
                });
            }
        }

        // Execute Batch Insert
        if (insertBatch.length > 0) {
            const { error } = await supabase.from('assessments').insert(insertBatch);
            if (error) {
                console.error(`      ❌ Failed insertions for ${emp.username}:`, error.message);
            } else {
                console.log(`      ✅ Inserted ${insertBatch.length} total assessments for ${emp.username}`);
            }
        }
    }
}

async function assignCertifications(userIdMap: Map<string, string>): Promise<void> {
    console.log('\n🏆 STEP 5: Assigning certifications...');

    for (const emp of DEMO_EMPLOYEES) {
        const userId = userIdMap.get(emp.username);
        if (!userId || !emp.certifications || emp.certifications.length === 0) continue;

        console.log(`   Assigning ${emp.certifications.length} certifications to ${emp.username}...`);

        const certs = emp.certifications.map(cert => ({
            user_id: userId,
            name: cert.name,
            issuer: cert.issuer,
            issue_date: daysAgo(cert.yearsAgo * 365),
            expiry_date: null,
            credential_id: `CERT-${randomInRange(10000, 99999)}`,
            description: `${cert.name} earned`
        }));

        const { error } = await supabase.from('employee_certifications').insert(certs);
        if (error) console.error(`   ❌ Failed to insert certs for ${emp.username}:`, error.message);
        else console.log(`   ✅ Inserted certifications for ${emp.username}`);
    }
}

async function createCareerGoals(userIdMap: Map<string, string>): Promise<void> {
    console.log('\n🎯 STEP 6: Creating career goals...');

    for (const emp of DEMO_EMPLOYEES) {
        const userId = userIdMap.get(emp.username);
        if (!userId) continue;

        if (emp.careerGoal) {
            console.log(`   Creating career goal for ${emp.username}: "${emp.careerGoal.title}"...`);
            const { error } = await supabase.from('employee_career_goals').insert({
                user_id: userId,
                goal_title: emp.careerGoal.title,
                goal_description: emp.careerGoal.description,
                target_timeframe: emp.careerGoal.timeframe,
                status: 'active'
            });
            if (error) console.error(`   ❌ Failed:`, error.message);
            else console.log(`   ✅ Created career goal for ${emp.username}`);
        } else {
            console.log(`   ℹ️  Skipping career goal for ${emp.username} (Intentionally kept empty).`);
        }
    }
}

async function updateEmployeeSkillProfiles(userIdMap: Map<string, string>): Promise<void> {
    console.log('\n🧠 STEP 7: calculating and updating skill profiles...');

    for (const [username, userId] of userIdMap.entries()) {
        if (username === 'Adam') continue; // Skip admin

        // Fetch all assessments for this user with scenario details
        const { data: assessments, error } = await supabase
            .from('assessments')
            .select('score, scenario:scenarios(skill)')
            .eq('user_id', userId);

        if (error || !assessments) {
            console.error(`   ❌ Failed to fetch assessments for ${username}:`, error?.message);
            continue;
        }

        // Calculate averages per skill
        const skillMap: Record<string, { total: number; count: number }> = {};

        assessments.forEach((a: any) => {
            const skill = a.scenario?.skill;
            if (skill && skill !== 'General') {
                if (!skillMap[skill]) {
                    skillMap[skill] = { total: 0, count: 0 };
                }
                skillMap[skill].total += (a.score || 0);
                skillMap[skill].count += 1;
            }
        });

        const skills_profile: Record<string, number> = {};
        Object.entries(skillMap).forEach(([skill, data]) => {
            skills_profile[skill] = Math.round(data.total / data.count);
        });

        // Update the employee record
        const { error: updateError } = await supabase
            .from('employees')
            .update({ skills_profile })
            .eq('id', userId);

        if (updateError) {
            console.error(`   ❌ Failed to update profile for ${username}:`, updateError.message);
        } else {
            console.log(`   ✅ Updated skill profile for ${username} (${Object.keys(skills_profile).length} skills)`);
        }
    }
}

// Main execution
async function main(): Promise<void> {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('        DEMO USER RESET SCRIPT (Rev 3)');
    console.log('═══════════════════════════════════════════════════════════');

    try {
        await deleteExistingUsers();
        const userIdMap = await createEmployees();
        await createAdmin();
        await generateAssessmentHistory(userIdMap);
        await assignCertifications(userIdMap);
        await createCareerGoals(userIdMap);
        await updateEmployeeSkillProfiles(userIdMap);

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('✅ DEMO USER RESET COMPLETE!');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('Stats: Software Development is 1.00 (Expert)');
        console.log('Stats: Other skills are varied/low to allow growth.');
        console.log('Login: TrialEmployee (all users)');
        console.log('═══════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ Script failed with error:', error);
        process.exit(1);
    }
}

main();
