import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { S3Client, GetBucketCorsCommand } from '@aws-sdk/client-s3';

const region = process.env.AWS_S3_REGION || 'us-east-1';
const bucket = process.env.AWS_S3_BUCKET_NAME || 'ai-hackathon-uploads';

const s3Client = new S3Client({ region });

async function checkCors() {
    console.log(`Checking CORS for bucket: ${bucket} in region: ${region}`);
    try {
        const data = await s3Client.send(new GetBucketCorsCommand({ Bucket: bucket }));
        console.log("Current CORS Configuration:");
        console.log(JSON.stringify(data.CORSRules, null, 2));
    } catch (err: any) {
        console.error("Error fetching CORS config:", err.message);
    }
}

checkCors();
