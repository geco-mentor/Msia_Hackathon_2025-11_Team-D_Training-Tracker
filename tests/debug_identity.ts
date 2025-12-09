import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const stsClient = new STSClient({ region: process.env.AWS_REGION });

async function debugIdentity() {
    try {
        const command = new GetCallerIdentityCommand({});
        const response = await stsClient.send(command);
        fs.writeFileSync("identity.txt", "ARN: " + response.Arn);
    } catch (err) {
        fs.writeFileSync("identity.txt", "ERROR: " + err.message);
    }
}

debugIdentity();
