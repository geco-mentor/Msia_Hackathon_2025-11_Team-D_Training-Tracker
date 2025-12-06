import { testS3 } from "./test_s3";
import { testBedrock } from "./test_bedrock";
import { testComprehend } from "./test_comprehend";
import { testTextract } from "./test_textract";

async function runAllTests() {
    console.log("Starting AWS Connectivity Tests...\n");

    const s3Result = await testS3();
    const bedrockResult = await testBedrock();
    const comprehendResult = await testComprehend();
    const textractResult = await testTextract();

    console.log("\n--- Test Summary ---");
    console.log(`S3: ${s3Result ? "PASS" : "FAIL"}`);
    console.log(`Bedrock: ${bedrockResult ? "PASS" : "FAIL"}`);
    console.log(`Comprehend: ${comprehendResult ? "PASS" : "FAIL"}`);
    console.log(`Textract: ${textractResult ? "PASS" : "FAIL"}`);

    if (s3Result && bedrockResult && comprehendResult && textractResult) {
        console.log("\nAll tests passed successfully!");
        process.exit(0);
    } else {
        console.error("\nSome tests failed.");
        process.exit(1);
    }
}

runAllTests();
