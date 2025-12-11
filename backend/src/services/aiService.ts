import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../../../.env');
console.log(`[aiService] Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

const region = process.env.AWS_REGION || 'us-east-1';
console.log(`[aiService] AWS_REGION: ${region}`);
console.log(`[aiService] AWS_PROFILE: ${process.env.AWS_PROFILE}`);
console.log(`[aiService] AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not Set'}`);

const client = new BedrockRuntimeClient({ region });

const MODELS = {
    GENERATION: "qwen.qwen3-235b-a22b-2507-v1:0",
    EVALUATION: [
        "qwen.qwen3-235b-a22b-2507-v1:0",
        "amazon.titan-text-lite-v1",
        "qwen.qwen3-32b-v1:0"
    ]
};

// Helper to invoke model using Converse API
async function invokeModel(modelId: string, prompt: string, systemText?: string) {
    try {
        console.log(`DEBUG: Invoking model ${modelId} in region ${region}`);
        // Prepend system prompt to user prompt if provided, as some models (like Titan Lite) don't support system messages
        const finalPrompt = systemText ? `System: ${systemText}\n\nUser: ${prompt}` : prompt;

        const messages = [{
            role: "user" as const,
            content: [{ text: finalPrompt }]
        }];

        // Remove system parameter from command config
        const command = new ConverseCommand({
            modelId,
            messages,
            inferenceConfig: {
                maxTokens: 1024,
                temperature: 0.7,
            }
        });

        const response = await client.send(command);

        if (response.output?.message?.content?.[0]?.text) {
            return response.output.message.content[0].text;
        }
        return "";

    } catch (error: any) {
        console.error(`Error invoking model ${modelId}:`, error);
        if (error.name) console.error(`Error Name: ${error.name}`);
        if (error.message) console.error(`Error Message: ${error.message}`);
        if (error.$metadata) console.error(`Error Metadata:`, error.$metadata);
        return null; // Return null on failure so we can handle it
    }
}

export const model = {
    generateContent: async (prompt: string) => {
        console.log('DEBUG: generateContent called with Bedrock.');

        // Use Titan Express for generation
        const text = await invokeModel(MODELS.GENERATION, prompt);

        if (!text) {
            throw new Error("Failed to generate content from AWS Bedrock");
        }

        return {
            response: {
                text: () => text
            }
        };
    },

    evaluateWithMultipleModels: async (prompt: string) => {
        console.log('DEBUG: evaluateWithMultipleModels called.');

        const promises = MODELS.EVALUATION.map(modelId => invokeModel(modelId, prompt, "You are an AI evaluator. Output valid JSON only."));

        const results = await Promise.all(promises);

        // Filter out failed requests
        const validResults = results.filter(r => r !== null) as string[];

        if (validResults.length === 0) {
            throw new Error("All models failed to evaluate.");
        }

        return validResults;
    }
};
