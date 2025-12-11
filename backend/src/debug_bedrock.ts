import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

const region = process.env.AWS_REGION || 'us-east-1';
console.log(`AWS_REGION: ${region}`);
console.log(`AWS_PROFILE: ${process.env.AWS_PROFILE}`);

const client = new BedrockRuntimeClient({ region });

const modelId = "amazon.titan-text-express-v1";
const prompt = "Hello, are you working?";

async function test() {
    try {
        console.log(`Invoking model ${modelId}...`);
        const command = new ConverseCommand({
            modelId,
            messages: [{ role: "user", content: [{ text: prompt }] }],
            inferenceConfig: { maxTokens: 100, temperature: 0.7 }
        });

        const response = await client.send(command);
        console.log("Response received:");
        console.log(response.output?.message?.content?.[0]?.text);
        console.log("SUCCESS: Bedrock is working.");
    } catch (error: any) {
        console.error("ERROR: Bedrock invocation failed.");
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        if (error.$metadata) console.error("Metadata:", JSON.stringify(error.$metadata, null, 2));

        console.log("--- Environment Check ---");
        console.log("AWS_ACCESS_KEY_ID Set:", !!process.env.AWS_ACCESS_KEY_ID);
        console.log("AWS_SECRET_ACCESS_KEY Set:", !!process.env.AWS_SECRET_ACCESS_KEY);
        console.log("AWS_SESSION_TOKEN Set:", !!process.env.AWS_SESSION_TOKEN);
        console.log("AWS_REGION:", process.env.AWS_REGION);
    }
}

test();
