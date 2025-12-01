const { BedrockRuntimeClient, ConverseCommand } = require("@aws-sdk/client-bedrock-runtime");
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.warn("Warning: .env file not found or could not be loaded.");
}

const region = process.env.AWS_REGION || 'us-east-1';
console.log(`\n--- AWS Configuration ---`);
console.log(`Region: ${region}`);
console.log(`Profile: ${process.env.AWS_PROFILE || '(not set)'}`);
console.log(`Access Key ID: ${process.env.AWS_ACCESS_KEY_ID ? 'Set (starts with ' + process.env.AWS_ACCESS_KEY_ID.substring(0, 4) + ')' : '(not set)'}`);

async function testConnection() {
    console.log(`\n--- Testing Bedrock Connectivity ---`);
    const client = new BedrockRuntimeClient({ region });

    const modelsToTest = [
        "amazon.titan-text-express-v1",
        "anthropic.claude-3-sonnet-20240229-v1:0"
    ];

    for (const modelId of modelsToTest) {
        console.log(`\n----------------------------------------`);
        console.log(`Attempting to invoke model: ${modelId}`);

        const conversation = [
            {
                role: "user",
                content: [{ text: "Hello, are you working?" }],
            },
        ];

        try {
            const command = new ConverseCommand({
                modelId,
                messages: conversation,
                inferenceConfig: { maxTokens: 512, temperature: 0.5 },
            });

            const response = await client.send(command);
            const responseText = response.output.message.content[0].text;

            console.log(`\n✅ SUCCESS! Model responded:`);
            console.log(responseText);

        } catch (error) {
            console.error(`\n❌ FAILED to invoke model: ${modelId}`);
            console.error(`Error Name: ${error.name}`);
            console.error(`Error Message: ${error.message}`);

            if (error.name === 'AccessDeniedException') {
                console.error(`\nDiagnosis: Model Access Denied.`);
                console.error(`Fix: Go to AWS Bedrock Console -> Model access -> Enable '${modelId}'.`);
            } else if (error.name === 'UnrecognizedClientException' || error.name === 'InvalidSignatureException') {
                console.error(`\nDiagnosis: Invalid Credentials.`);
            } else if (error.name === 'ResourceNotFoundException') {
                console.error(`\nDiagnosis: Model or Region issue.`);
                console.error(`Fix: Check if '${modelId}' is enabled in region '${region}'.`);
            }
        }
    }
}

testConnection();
