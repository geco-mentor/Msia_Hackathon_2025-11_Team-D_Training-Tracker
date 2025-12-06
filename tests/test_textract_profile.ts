import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const REGION = process.env.AWS_S3_REGION || 'us-east-1';

console.log("=== Textract Test (EC2 Instance Role) ===");
console.log("Using region:", REGION);
console.log("\nThis test uses the EC2 instance role directly (bedrockFullAccess attached to EC2).\n");

async function testTextract() {
    console.log("--- Testing Textract ---");

    try {
        // Use default credentials - on EC2 this is the attached instance role
        const textractClient = new TextractClient({ region: REGION });

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

        console.log("\n=== Textract Test PASSED ===\n");
        return true;
    } catch (err: any) {
        console.error("\nError testing Textract:", err.message);
        if (err.__type) console.error("Error Type:", err.__type);
        if (err.Code) console.error("Error Code:", err.Code);
        if (err.$metadata) console.error("Metadata:", JSON.stringify(err.$metadata, null, 2));
        console.log("\n=== Textract Test FAILED ===\n");
        return false;
    }
}

if (require.main === module) {
    testTextract().then((success) => {
        process.exit(success ? 0 : 1);
    });
}

export { testTextract };
