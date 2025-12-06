import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

const region = process.env.AWS_S3_REGION || 'us-east-1';
const bucket = process.env.AWS_S3_BUCKET_NAME || 'ai-hackathon-uploads';

const s3Client = new S3Client({ region });

async function updateCors() {
    console.log(`Updating CORS for bucket: ${bucket} in region: ${region}`);

    const corsRules = [
        {
            AllowedHeaders: ["*"],
            AllowedMethods: ["PUT", "POST", "GET", "HEAD", "DELETE"],
            AllowedOrigins: ["*"], // Allow all origins
            ExposeHeaders: ["ETag", "x-amz-server-side-encryption", "x-amz-request-id", "x-amz-id-2"],
            MaxAgeSeconds: 3000
        }
    ];

    try {
        await s3Client.send(new PutBucketCorsCommand({
            Bucket: bucket,
            CORSConfiguration: {
                CORSRules: corsRules
            }
        }));
        console.log("✅ CORS configuration updated successfully.");
    } catch (err: any) {
        console.error("❌ Error updating CORS:", err.message);
    }
}

updateCors();
