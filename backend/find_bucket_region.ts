
import { S3Client, GetBucketLocationCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const bucketName = process.env.AWS_S3_BUCKET_NAME;

// We can use us-east-1 as a starting point for GetBucketLocation
const s3Client = new S3Client({
    region: "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        sessionToken: process.env.AWS_SESSION_TOKEN,
    },
});

async function findRegion() {
    console.log(`Finding region for bucket: ${bucketName}...`);

    try {
        const command = new GetBucketLocationCommand({ Bucket: bucketName });
        const response = await s3Client.send(command);
        console.log("Bucket LocationConstraint:", response.LocationConstraint);
        // If LocationConstraint is empty/undefined, it means us-east-1
        // Otherwise it's the region string (e.g., us-west-2)
    } catch (error: any) {
        console.error("Error finding bucket region:");
        console.error("Message:", error.message);
        console.error("Full Error:", JSON.stringify(error, null, 2));
    }
}

findRegion();
