import { ComprehendClient, DetectSentimentCommand } from "@aws-sdk/client-comprehend";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const comprehendClient = new ComprehendClient({
    region: process.env.AWS_REGION
});

async function testComprehend() {
    console.log("--- Testing Comprehend ---");
    try {
        const text = "I am very happy with the results of this test.";
        console.log(`Detecting sentiment for text: "${text}"...`);

        const command = new DetectSentimentCommand({
            Text: text,
            LanguageCode: "en",
        });

        const response = await comprehendClient.send(command);
        console.log("Sentiment detected:", response.Sentiment);
        console.log("Sentiment Score:", response.SentimentScore);

        console.log("--- Comprehend Test Passed ---\n");
        return true;
    } catch (err) {
        console.error("Error testing Comprehend:", err);
        console.log("--- Comprehend Test Failed ---\n");
        return false;
    }
}

if (require.main === module) {
    testComprehend();
}

export { testComprehend };
