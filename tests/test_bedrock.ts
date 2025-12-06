import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION
});

async function testBedrock() {
    console.log("--- Testing Bedrock ---");
    try {
        // Using Titan Text Express as a default test model
        const modelId = "amazon.titan-text-express-v1";
        const prompt = "Hello, how are you?";

        console.log(`Invoking model: ${modelId} with prompt: "${prompt}"...`);

        const payload = {
            inputText: prompt,
            textGenerationConfig: {
                maxTokenCount: 50,
                stopSequences: [],
                temperature: 0.7,
                topP: 1,
            },
        };

        const command = new InvokeModelCommand({
            modelId: modelId,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(payload),
        });

        const response = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        console.log("Response received:");
        console.log(responseBody.results?.[0]?.outputText || responseBody);

        console.log("--- Bedrock Test Passed ---\n");
        return true;
    } catch (err) {
        console.error("Error testing Bedrock:", err);
        console.log("--- Bedrock Test Failed ---\n");
        return false;
    }
}

if (require.main === module) {
    testBedrock();
}

export { testBedrock };
