import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { TextractClient, StartDocumentTextDetectionCommand } from '@aws-sdk/client-textract';
import * as fs from 'fs';

async function testProcess() {
    console.log("=== Testing Full Upload + Process Flow ===\n");

    const region = process.env.AWS_S3_REGION || 'us-east-1';
    const bucket = process.env.AWS_S3_BUCKET_NAME;

    console.log("Config:");
    console.log("  AWS_S3_REGION:", region);
    console.log("  AWS_S3_BUCKET_NAME:", bucket);
    console.log("  AWS_REGION:", process.env.AWS_REGION);

    if (!bucket) {
        console.error("❌ AWS_S3_BUCKET_NAME not set!");
        return;
    }

    try {
        const s3Client = new S3Client({ region });

        // 1. Upload a test file
        const testKey = `uploads/test-user/${Date.now()}-test.txt`;
        const testContent = "This is a test training material about cybersecurity. It covers password security, phishing awareness, and data protection protocols.";

        console.log("\n1. Uploading test file to S3...");
        await s3Client.send(new PutObjectCommand({
            Bucket: bucket,
            Key: testKey,
            Body: testContent,
            ContentType: 'text/plain'
        }));
        console.log("   ✅ Uploaded:", testKey);

        // 2. Try to read it back
        console.log("\n2. Reading file back from S3...");
        const getResponse = await s3Client.send(new GetObjectCommand({
            Bucket: bucket,
            Key: testKey
        }));
        const retrievedContent = await getResponse.Body?.transformToString();
        console.log("   ✅ Retrieved content:", retrievedContent?.substring(0, 50) + "...");

        // 3. Test Textract (this is likely where it fails for PDFs)
        console.log("\n3. Testing Textract client...");
        const textractClient = new TextractClient({ region: process.env.AWS_REGION || 'us-east-1' });
        console.log("   ✅ Textract client created");

        // 4. Test Bedrock
        console.log("\n4. Testing Bedrock client...");
        const { BedrockRuntimeClient, ConverseCommand } = await import('@aws-sdk/client-bedrock-runtime');
        const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

        const testPrompt = "Say hello in one word.";
        const command = new ConverseCommand({
            modelId: "amazon.titan-text-express-v1",
            messages: [{ role: "user", content: [{ text: testPrompt }] }],
            inferenceConfig: { maxTokens: 10 }
        });

        const bedrockResponse = await bedrockClient.send(command);
        const aiText = bedrockResponse.output?.message?.content?.[0]?.text;
        console.log("   ✅ Bedrock response:", aiText);

        console.log("\n=== All Tests Passed! ===");

    } catch (err: any) {
        console.error("\n❌ ERROR:");
        console.error("   Name:", err.name);
        console.error("   Message:", err.message);
        console.error("   Code:", err.Code || err.code);
        if (err.stack) {
            console.error("   Stack:", err.stack.split('\n').slice(0, 3).join('\n'));
        }
    }
}

testProcess();
