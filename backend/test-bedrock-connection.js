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
    const modelId = "amazon.titan-text-express-v1";

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
        console.log(`\nYour AWS credentials and region configuration are correct.`);

    } catch (error) {
        console.error(`\n❌ FAILED to invoke model.`);
        console.error(`Error Name: ${error.name}`);
        console.error(`Error Message: ${error.message}`);

        if (error.name === 'UnrecognizedClientException' || error.name === 'InvalidSignatureException') {
            console.error(`\nDiagnosis: Invalid Credentials. The server cannot authenticate with AWS.`);
            console.error(`Fix: Ensure an IAM Role is attached to this EC2 instance OR set AWS_ACCESS_KEY_ID/SECRET in .env.`);
        } else if (error.name === 'AccessDeniedException') {
            console.error(`\nDiagnosis: Permission Denied. The credentials are valid but lack permission to invoke Bedrock.`);
            console.error(`Fix: Add 'bedrock:InvokeModel' permission to your IAM Role/User.`);
        } else if (error.name === 'ResourceNotFoundException') {
            console.error(`\nDiagnosis: Model or Region issue.`);
            console.error(`Fix: Check if '${modelId}' is enabled in region '${region}'.`);
        } else if (error.message.includes('Could not load credentials')) {
            console.error(`\nDiagnosis: No Credentials Found.`);
            console.error(`Fix: You removed AWS_PROFILE but didn't attach an IAM Role or set keys. The SDK has no way to login.`);
        }
    }
}

testConnection();
