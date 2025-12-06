import { S3Client, ListBucketsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

console.log("AWS_REGION:", process.env.AWS_REGION);
console.log("AWS_S3_REGION:", process.env.AWS_S3_REGION);

const s3Client = new S3Client({
    region: process.env.AWS_S3_REGION || 'us-east-1'
});

async function testS3() {
    console.log("--- Testing S3 ---");
    try {
        // Test 1: List Buckets
        console.log("Attempting to list buckets...");
        const data = await s3Client.send(new ListBucketsCommand({}));
        console.log("Success. Buckets found:", data.Buckets?.length || 0);

        // Test 2: Upload a test file (optional, if bucket name is provided)
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        if (bucketName) {
            console.log(`Attempting to upload a test file to bucket: ${bucketName}...`);
            const testFileName = "test_upload.txt";
            const testFileContent = "This is a test file from the AWS connectivity test script.";

            await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: testFileName,
                Body: testFileContent,
            }));
            console.log("Successfully uploaded test file.");
        } else {
            console.log("Skipping upload test: AWS_S3_BUCKET_NAME not defined.");
        }

        console.log("--- S3 Test Passed ---\n");
        return true;
    } catch (err) {
        console.error("Error testing S3:", err.message);
        console.log("--- S3 Test Failed ---\n");
        return false;
    }
}

if (require.main === module) {
    testS3();
}

export { testS3 };
