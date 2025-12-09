import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

async function testUploadUrl() {
    console.log("=== Debugging Upload URL Generation ===");
    console.log("AWS_S3_REGION:", process.env.AWS_S3_REGION || "(not set, defaulting to us-east-1)");
    console.log("AWS_S3_BUCKET_NAME:", process.env.AWS_S3_BUCKET_NAME || "(not set)");
    console.log("AWS_REGION:", process.env.AWS_REGION || "(not set)");

    const region = process.env.AWS_S3_REGION || 'us-east-1';
    const bucket = process.env.AWS_S3_BUCKET_NAME;

    if (!bucket) {
        console.error("❌ ERROR: AWS_S3_BUCKET_NAME is not set in .env");
        return;
    }

    try {
        const s3Client = new S3Client({ region });
        console.log("\n✓ S3Client created with region:", region);

        const key = `uploads/test-user/${Date.now()}-test.pdf`;
        const contentType = 'application/pdf';

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType
        });

        console.log("Generating signed URL for:");
        console.log("  - Bucket:", bucket);
        console.log("  - Key:", key);
        console.log("  - ContentType:", contentType);

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        console.log("\n✅ SUCCESS! Signed URL generated:");
        console.log(uploadUrl.substring(0, 100) + "...");

    } catch (err: any) {
        console.error("\n❌ ERROR generating signed URL:");
        console.error("  Name:", err.name);
        console.error("  Message:", err.message);
        console.error("  Code:", err.Code);
        console.error("  Full error:", JSON.stringify(err, null, 2));
    }
}

testUploadUrl();
