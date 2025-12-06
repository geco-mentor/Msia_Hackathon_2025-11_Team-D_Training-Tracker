import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } from '@aws-sdk/client-textract';
import { ComprehendClient, DetectKeyPhrasesCommand, DetectEntitiesCommand } from '@aws-sdk/client-comprehend';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { supabase } from '../config/database';

// Lazy initialization of AWS clients to ensure dotenv has loaded
let _s3Client: S3Client | null = null;
let _textractClient: TextractClient | null = null;
let _comprehendClient: ComprehendClient | null = null;
let _bedrockClient: BedrockRuntimeClient | null = null;

const getS3Client = () => {
    if (!_s3Client) {
        const region = process.env.AWS_S3_REGION || 'us-east-1';
        console.log('Initializing S3Client with region:', region);
        _s3Client = new S3Client({ region });
    }
    return _s3Client;
};

const getTextractClient = () => {
    if (!_textractClient) {
        const region = process.env.AWS_REGION || 'us-east-1';
        _textractClient = new TextractClient({ region });
    }
    return _textractClient;
};

const getComprehendClient = () => {
    if (!_comprehendClient) {
        const region = process.env.AWS_REGION || 'us-east-1';
        _comprehendClient = new ComprehendClient({ region });
    }
    return _comprehendClient;
};

const getBedrockClient = () => {
    if (!_bedrockClient) {
        const region = process.env.AWS_REGION || 'us-east-1';
        _bedrockClient = new BedrockRuntimeClient({ region });
    }
    return _bedrockClient;
};

export const generateUploadUrl = async (bucket: string, key: string, contentType: string) => {
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType
    });
    return await getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
};

export const readTextFile = async (bucket: string, key: string): Promise<string> => {
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
    });
    const response = await getS3Client().send(command);
    return await response.Body?.transformToString() || '';
};

// Save extracted text to S3
export const saveTextToS3 = async (bucket: string, key: string, text: string): Promise<string> => {
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: text,
        ContentType: 'text/plain'
    });
    await getS3Client().send(command);
    console.log(`DEBUG: Saved extracted text to S3: ${key}`);
    return key;
};

// Helper function: Extract text using AWS Textract
const extractWithTextract = async (bucket: string, key: string): Promise<string> => {
    const startCommand = new StartDocumentTextDetectionCommand({
        DocumentLocation: {
            S3Object: {
                Bucket: bucket,
                Name: key
            }
        }
    });

    const startResponse = await getTextractClient().send(startCommand);
    const jobId = startResponse.JobId;

    if (!jobId) {
        throw new Error('Failed to start Textract job');
    }

    let jobStatus = 'IN_PROGRESS';
    let pagesText: string[] = [];

    while (jobStatus === 'IN_PROGRESS') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const getCommand = new GetDocumentTextDetectionCommand({ JobId: jobId });
        const getResponse = await getTextractClient().send(getCommand);
        jobStatus = getResponse.JobStatus || 'FAILED';

        if (jobStatus === 'SUCCEEDED' && getResponse.Blocks) {
            const pageText = getResponse.Blocks
                .filter((b) => b.BlockType === 'LINE' && b.Text)
                .map((b) => b.Text)
                .join('\n');
            pagesText.push(pageText);
        }
    }

    if (jobStatus !== 'SUCCEEDED') {
        throw new Error(`Textract job failed with status: ${jobStatus}`);
    }

    return pagesText.join('\n');
};

// Helper function: Extract text using unpdf (local fallback)
const extractWithUnpdf = async (bucket: string, key: string): Promise<string> => {
    // Download the PDF from S3
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
    });
    const response = await getS3Client().send(command);

    if (!response.Body) {
        throw new Error('Failed to download PDF from S3');
    }

    // Convert stream to Uint8Array
    const byteArray = await response.Body.transformToByteArray();
    const uint8Array = new Uint8Array(byteArray);

    // Use unpdf to extract text (correct API)
    const { extractText, getDocumentProxy } = await import('unpdf');

    // Step 1: Get document proxy
    const pdf = await getDocumentProxy(uint8Array);

    // Step 2: Extract text with merged pages
    const { text, totalPages } = await extractText(pdf, { mergePages: true });

    // Handle empty text gracefully - some PDFs may be scanned images
    if (!text || text.trim().length === 0) {
        console.warn(`unpdf extracted no text from ${totalPages} pages - PDF may contain only images`);
        return `[PDF Document with ${totalPages} page(s) - Text could not be extracted. This may be a scanned document or image-based PDF.]`;
    }

    console.log(`unpdf extracted ${text.length} characters from ${totalPages} pages`);
    return text;
};

// Main extraction function with Textract-first fallback strategy
export const extractTextFromPdf = async (bucket: string, key: string): Promise<string> => {
    // Try Textract first (better OCR, handles scanned PDFs)
    try {
        console.log(`Attempting Textract extraction for ${key}...`);
        const text = await extractWithTextract(bucket, key);
        console.log(`✓ Textract extraction successful for ${key}`);
        return text;
    } catch (textractError: any) {
        // Log Textract failure and fall back to unpdf
        console.warn(`Textract extraction failed for ${key}: ${textractError.message}`);
        console.log(`Falling back to unpdf for ${key}...`);

        try {
            const text = await extractWithUnpdf(bucket, key);
            console.log(`✓ unpdf extraction successful for ${key}`);
            return text;
        } catch (unpdfError: any) {
            // Both methods failed
            console.error(`Both Textract and unpdf failed for ${key}`);
            throw new Error(`Failed to extract text from PDF: Textract error: ${textractError.message}, unpdf error: ${unpdfError.message}`);
        }
    }
};

export const analyzeText = async (text: string) => {
    const truncatedText = text.substring(0, 4500);

    const keyPhrasesCommand = new DetectKeyPhrasesCommand({
        Text: truncatedText,
        LanguageCode: 'en'
    });
    const entitiesCommand = new DetectEntitiesCommand({
        Text: truncatedText,
        LanguageCode: 'en'
    });

    const [keyPhrasesResponse, entitiesResponse] = await Promise.all([
        getComprehendClient().send(keyPhrasesCommand),
        getComprehendClient().send(entitiesCommand)
    ]);

    return {
        keyPhrases: keyPhrasesResponse.KeyPhrases,
        entities: entitiesResponse.Entities
    };
};

// ============================================
// RUBRIC GENERATION - Admin Assessment Upload
// ============================================

// Fetch generic rubrics from database
export const fetchGenericRubrics = async (): Promise<string[]> => {
    try {
        const { data, error } = await supabase
            .from('general_rubrics')
            .select('name')
            .order('display_order');

        if (error) {
            console.warn('Error fetching generic rubrics:', error.message);
            // Return default rubrics if table doesn't exist or is empty
            return ['Communication', 'Critical Thinking', 'Problem Solving'];
        }

        if (!data || data.length === 0) {
            console.warn('No generic rubrics found in database, using defaults');
            return ['Communication', 'Critical Thinking', 'Problem Solving'];
        }

        return data.map((r: { name: string }) => r.name);
    } catch (err: any) {
        console.warn('Failed to fetch generic rubrics:', err.message);
        return ['Communication', 'Critical Thinking', 'Problem Solving'];
    }
};

// Fetch department rubrics from database
export const fetchDepartmentRubrics = async (departmentId: string): Promise<string[]> => {
    try {
        const { data, error } = await supabase
            .from('departments')
            .select('rubrics')
            .eq('id', departmentId)
            .single();

        if (error) {
            console.warn('Error fetching department rubrics:', error.message);
            return ['Department Knowledge', 'Process Compliance', 'Best Practices'];
        }

        return data?.rubrics || ['Department Knowledge', 'Process Compliance', 'Best Practices'];
    } catch (err: any) {
        console.warn('Failed to fetch department rubrics:', err.message);
        return ['Department Knowledge', 'Process Compliance', 'Best Practices'];
    }
};

// AI generates ONLY the 3 module-specific rubrics from the uploaded content
export const generateModuleRubrics = async (text: string): Promise<string[]> => {
    const prompt = `
    Analyze this training material and extract exactly 3 key topics/concepts that should be evaluated.

    Training Material:
    ${text.substring(0, 6000)}

    Return ONLY a JSON array of exactly 3 strings, each being a specific concept from the text.
    Example: ["Password Security", "Phishing Recognition", "Data Encryption"]

    Rules:
    - Extract actual topics mentioned in the text
    - Each must be different
    - Keep them concise (2-4 words each)
    - Return ONLY the JSON array, nothing else
    `;

    const command = new ConverseCommand({
        modelId: "amazon.titan-text-express-v1",
        messages: [{ role: "user", content: [{ text: prompt }] }],
        inferenceConfig: { maxTokens: 200, temperature: 0 }
    });

    console.log('DEBUG: Calling Bedrock for module rubrics...');
    const response = await getBedrockClient().send(command);

    const content = response.output?.message?.content?.[0]?.text || "[]";
    console.log("DEBUG: Raw AI Module Rubrics Response:", content);

    const firstOpen = content.indexOf('[');
    const lastClose = content.lastIndexOf(']');

    if (firstOpen === -1 || lastClose === -1 || lastClose <= firstOpen) {
        throw new Error(`AI did not return valid array. Response: ${content}`);
    }

    const jsonString = content.substring(firstOpen, lastClose + 1);
    const rubrics = JSON.parse(jsonString);

    if (!Array.isArray(rubrics) || rubrics.length !== 3) {
        throw new Error(`AI returned invalid rubrics array. Expected 3 items, got: ${JSON.stringify(rubrics)}`);
    }

    console.log('DEBUG: Module rubrics generated:', rubrics);
    return rubrics;
};

// Main function called by assessmentController - generates ONLY rubrics, not full scenario
export const generateRubricsFromText = async (text: string, departmentId?: string) => {
    console.log('DEBUG: Generating rubrics from text...');
    const genericRubrics = await fetchGenericRubrics();

    let departmentRubrics: string[] = [];
    if (departmentId) {
        departmentRubrics = await fetchDepartmentRubrics(departmentId);
    }

    const moduleRubrics = await generateModuleRubrics(text);

    const rubric = {
        generic: genericRubrics,
        department: departmentRubrics,
        module: moduleRubrics
    };

    console.log('DEBUG: Final rubric structure:', JSON.stringify(rubric, null, 2));
    return rubric;
};

// --- Employee Flow AI Functions ---

export const generateAdaptiveQuestion = async (contextText: string, history: { question: string, answer: string }[]) => {
    const historyText = history.length > 0
        ? history.map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join('\n\n')
        : "No previous interaction.";

    const prompt = `
    You are a helpful mentor.
    
    Context:
    ${contextText.substring(0, 5000)} ...

    History:
    ${historyText}

    Task:
    Ask the user a single interesting question about the Context to start a discussion.
    - If History is empty, ask a general question.
    - If History exists, ask a follow-up question.
    
    IMPORTANT: Return ONLY the question text.
    `;

    const command = new ConverseCommand({
        modelId: "amazon.titan-text-express-v1",
        messages: [{ role: "user", content: [{ text: prompt }] }],
        inferenceConfig: { maxTokens: 500, temperature: 0.7 }
    });

    const response = await getBedrockClient().send(command);
    let text = response.output?.message?.content?.[0]?.text || "Error generating question.";

    const match = text.match(/(?:Question:|Here is the question:|The question is:|\[Question\])\s*(.*)/is);
    if (match && match[1]) {
        text = match[1].trim();
    }
    text = text.split(/Answer:/i)[0].trim();

    return text;
};

export const generatePostAssessmentQuestions = async (contextText: string) => {
    const prompt = `
    You are a trivia generator.
    
    Text:
    ${contextText.substring(0, 8000)} ...

    Task:
    Generate 5 trivia questions based on the Text.
    - Mix of multiple choice and short answer.
    
    Return a JSON array of objects.
    Example:
    [
        { "id": 1, "question": "Question?", "type": "multiple_choice", "options": ["A", "B", "C", "D"] },
        { "id": 2, "question": "Question?", "type": "short_answer" }
    ]
    
    IMPORTANT: Return ONLY the valid JSON array.
    `;

    const command = new ConverseCommand({
        modelId: "amazon.titan-text-express-v1",
        messages: [{ role: "user", content: [{ text: prompt }] }],
        inferenceConfig: { maxTokens: 2000, temperature: 0 }
    });

    const response = await getBedrockClient().send(command);
    const content = response.output?.message?.content?.[0]?.text || "[]";

    try {
        const firstOpen = content.indexOf('[');
        const lastClose = content.lastIndexOf(']');
        if (firstOpen !== -1 && lastClose !== -1) {
            return JSON.parse(content.substring(firstOpen, lastClose + 1));
        }
        return JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (e) {
        console.error("Failed to parse Post-Assessment questions. Raw content:", content);
        throw new Error("Failed to parse Post-Assessment questions from AI");
    }
};

export const evaluateAssessment = async (
    questions: { question: string, answer: string }[],
    rubrics: { generic: string[], department: string[], module: string[] }
) => {
    const qaText = questions.map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer}`).join('\n\n');
    const rubricsText = JSON.stringify(rubrics, null, 2);

    const prompt = `
    You are an expert grader. Evaluate the following student answers based on the provided rubrics.

    Rubrics (9 Criteria):
    ${rubricsText}

    Student Q&A:
    ${qaText}

    Task:
    1. Evaluate the answers against the 3 Generic, 3 Department, and 3 Module criteria.
    2. Provide a score (0-10) for each of the 9 criteria.
    3. Provide a brief feedback for each category.
    4. Calculate a final total score (0-100).

    Return JSON:
    {
        "scores": {
            "generic": [8, 9, 7],
            "department": [7, 8, 8],
            "module": [9, 9, 10]
        },
        "feedback": {
            "generic": "...",
            "department": "...",
            "module": "..."
        },
        "total_score": 85
    }
    
    IMPORTANT: Return ONLY the valid JSON object. Do NOT include markdown formatting.
    `;

    const command = new ConverseCommand({
        modelId: "amazon.titan-text-express-v1",
        messages: [{ role: "user", content: [{ text: prompt }] }],
        inferenceConfig: { maxTokens: 1500, temperature: 0 }
    });

    const response = await getBedrockClient().send(command);
    const content = response.output?.message?.content?.[0]?.text || "{}";

    try {
        const firstOpen = content.indexOf('{');
        const lastClose = content.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1) {
            return JSON.parse(content.substring(firstOpen, lastClose + 1));
        }
        return JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (e) {
        console.error("Failed to parse Evaluation", e);
        throw new Error("Failed to parse evaluation from AI");
    }
};
