/**
 * Test script to generate sample gamified questions
 * Job role: Tester
 * Curriculum: AWS Services
 */

import { generateMicroScenario } from '../src/services/awsService';

const jobDescription = "Software Tester - responsible for testing web applications, writing test cases, performing API testing, regression testing, and ensuring software quality before deployment.";

const curriculum = `
AWS Cloud Services Training

1. Amazon EC2 (Elastic Compute Cloud)
   - Virtual servers in the cloud
   - Instance types: t2.micro, m5.large, etc.
   - Auto Scaling groups for handling load
   - Security groups for firewall rules

2. Amazon S3 (Simple Storage Service)
   - Object storage for files and backups
   - Bucket policies and access controls
   - Versioning and lifecycle policies
   - Static website hosting

3. AWS Lambda
   - Serverless compute service
   - Event-driven execution
   - Pay only for compute time used
   - Integrates with API Gateway

4. Amazon RDS (Relational Database Service)
   - Managed database service
   - Supports MySQL, PostgreSQL, SQL Server
   - Automated backups and snapshots
   - Multi-AZ deployment for high availability

5. Amazon CloudWatch
   - Monitoring and observability service
   - Metrics, logs, and alarms
   - Dashboard for visualization
   - Automated actions based on thresholds

6. AWS IAM (Identity and Access Management)
   - Users, groups, and roles
   - Policies for fine-grained permissions
   - Multi-factor authentication (MFA)
   - Least privilege principle
`;

const rubrics = {
    generic: ['Communication', 'Critical Thinking', 'Problem Solving'],
    department: ['Testing Best Practices', 'Quality Assurance', 'Bug Reporting'],
    module: ['AWS EC2', 'AWS S3', 'AWS Lambda']
};

async function generateSampleQuestions() {
    console.log('='.repeat(60));
    console.log('🎮 GAMIFIED QUESTION GENERATOR TEST');
    console.log('Role: Software Tester | Topic: AWS Services');
    console.log('='.repeat(60));
    console.log('');

    const history: { scenario: string, question: string, answer: string }[] = [];
    const difficulties: ('Easy' | 'Normal' | 'Hard')[] = [
        'Easy', 'Easy', 'Easy',    // 3 Easy
        'Normal', 'Normal', 'Normal', 'Normal',  // 4 Normal
        'Hard', 'Hard', 'Hard'     // 3 Hard
    ];

    for (let i = 0; i < 10; i++) {
        const difficulty = difficulties[i];
        console.log(`\n--- Question ${i + 1} (${difficulty}) ---`);

        try {
            const result = await generateMicroScenario(
                curriculum,
                jobDescription,
                difficulty,
                rubrics,
                history
            );

            console.log(`📍 SCENARIO: ${result.scenario}`);
            console.log(`❓ QUESTION: ${result.question}`);
            console.log(`💡 HINT: ${result.hint}`);

            // Add to history to avoid duplicates
            history.push({
                scenario: result.scenario,
                question: result.question,
                answer: '' // Mock answer
            });

        } catch (error: any) {
            console.error(`❌ Error generating question ${i + 1}:`, error.message);
        }

        // Small delay between API calls
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Generation complete!');
    console.log('='.repeat(60));
}

generateSampleQuestions().catch(console.error);
