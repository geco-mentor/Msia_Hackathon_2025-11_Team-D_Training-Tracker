import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

console.log("AWS_REGION:", process.env.AWS_REGION);
console.log("AWS_S3_REGION:", process.env.AWS_S3_REGION);

const ROLE_ARN = "arn:aws:iam::100939136743:role/bedrockFullAccess";
const REGION = process.env.AWS_S3_REGION || 'us-east-1';

async function getAssumedRoleCredentials() {
    console.log("Attempting to assume role:", ROLE_ARN);

    const stsClient = new STSClient({ region: REGION });

    try {
        const command = new AssumeRoleCommand({
            RoleArn: ROLE_ARN,
            RoleSessionName: "TextractTestSession",
            DurationSeconds: 900, // 15 minutes
        });

        const response = await stsClient.send(command);

        if (response.Credentials) {
            console.log("Successfully assumed role!");
            return {
                accessKeyId: response.Credentials.AccessKeyId!,
                secretAccessKey: response.Credentials.SecretAccessKey!,
                sessionToken: response.Credentials.SessionToken!,
            };
        }
        throw new Error("No credentials returned from AssumeRole");
    } catch (err: any) {
        console.error("Failed to assume role:", err.message);
        console.log("Falling back to default credentials...");
        return undefined; // Use default credentials
    }
}

async function testTextract() {
    console.log("--- Testing Textract ---");
    console.log("Using region:", REGION);

    try {
        // Try to assume role first
        const assumedCredentials = await getAssumedRoleCredentials();

        // Create Textract client with assumed role credentials (or default if assume failed)
        const textractClient = new TextractClient({
            region: REGION,
            credentials: assumedCredentials,
        });

        // Minimal 1x1 PNG base64
        const dummyPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
        const imageBytes = Buffer.from(dummyPngBase64, 'base64');

        console.log("Sending a dummy 1x1 pixel image to Textract for text detection...");

        const command = new DetectDocumentTextCommand({
            Document: {
                Bytes: imageBytes,
            },
        });

        const response = await textractClient.send(command);
        console.log("Textract response received.");
        console.log("Blocks found:", response.Blocks?.length || 0);

        console.log("--- Textract Test Passed ---\n");
        return true;
    } catch (err: any) {
        console.error("Error testing Textract:", err.message);
        if (err.__type) console.error("Error Type:", err.__type);
        if (err.Code) console.error("Error Code:", err.Code);
        if (err.$metadata) console.error("Metadata:", JSON.stringify(err.$metadata, null, 2));
        console.log("--- Textract Test Failed ---\n");
        return false;
    }
}

if (require.main === module) {
    testTextract();
}

export { testTextract };
