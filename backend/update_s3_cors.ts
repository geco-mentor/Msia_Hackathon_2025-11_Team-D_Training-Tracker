
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const bucketName = process.env.AWS_S3_BUCKET_NAME;

if (!bucketName) {
    console.error("Error: AWS_S3_BUCKET_NAME is not defined in .env");
    process.exit(1);
}

// Initialize S3 Client matching awsService.ts logic
const s3Client = new S3Client({
    region: process.env.AWS_S3_REGION || process.env.AWS_REGION || "us-east-1"
});

async function updateCors() {
    console.log(`Updating CORS configuration for bucket: ${bucketName}...`);
    console.log(`Using region: ${await s3Client.config.region()}`);

    const corsRules = [
        {
            AllowedHeaders: ["*"],
            AllowedMethods: ["PUT", "POST", "GET", "HEAD", "DELETE"],
            AllowedOrigins: ["*"], // For development, allow all. In production, restrict to domain.
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3000,
        },
    ];

    try {
        const command = new PutBucketCorsCommand({
            Bucket: bucketName,
            CORSConfiguration: {
                CORSRules: corsRules,
            },
        });

        await s3Client.send(command);
        console.log("✅ Successfully updated S3 CORS configuration.");
    } catch (error: any) {
        console.error("❌ Error updating S3 CORS configuration:", error.message);
        if (error.Code) console.error("Code:", error.Code);
    }
}

updateCors();
