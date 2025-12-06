import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { saveTextToS3, generateRubricsFromText, extractTextFromPdf, readTextFile } from './services/awsService';

const testAssessmentFlow = async () => {
    console.log('=== TESTING ASSESSMENT UPLOAD FLOW ===\n');

    const bucket = process.env.AWS_S3_BUCKET_NAME;
    if (!bucket) {
        console.error('ERROR: AWS_S3_BUCKET_NAME not set in .env');
        process.exit(1);
    }
    console.log('✓ Bucket configured:', bucket);

    // Test 1: Save text to S3
    console.log('\n--- TEST 1: Save text to S3 ---');
    const testText = `Sample Training Material

This is a test training document about Cybersecurity Fundamentals.

Key Topics:
1. Password Security - Best practices for creating strong passwords
2. Phishing Recognition - How to identify phishing emails
3. Data Encryption - Protecting sensitive data at rest and in transit

Remember: Security is everyone's responsibility!`;

    const testUserId = 'test-user-123';
    const testKey = `extracted-text/${testUserId}/${Date.now()}-test-document.txt`;

    try {
        const savedKey = await saveTextToS3(bucket, testKey, testText);
        console.log('✓ Text saved to S3:', savedKey);
    } catch (error: any) {
        console.error('✗ Failed to save text to S3:', error.message);
        process.exit(1);
    }

    // Test 2: Generate rubrics from text
    console.log('\n--- TEST 2: Generate rubrics from text ---');
    try {
        const rubrics = await generateRubricsFromText(testText);
        console.log('✓ Rubrics generated successfully!');
        console.log('\nGeneric rubrics:', rubrics.generic);
        console.log('Department rubrics:', rubrics.department);
        console.log('Module rubrics:', rubrics.module);
    } catch (error: any) {
        console.error('✗ Failed to generate rubrics:', error.message);
        process.exit(1);
    }

    console.log('\n=== ALL TESTS PASSED ===');
};

testAssessmentFlow().catch(console.error);
