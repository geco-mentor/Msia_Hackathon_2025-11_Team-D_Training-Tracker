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
    const maxRetries = 10;
    let lastError = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const temperature = Math.min(1.0, 0.5 + (attempt * 0.05));

        const prompt = `Extract exactly 3 key topics from this training material.

Training Material:
${text.substring(0, 6000)}

Return ONLY a JSON array of 3 strings.
Example: ["Password Security", "Phishing Recognition", "Data Encryption"]`;

        const command = new ConverseCommand({
            modelId: "qwen.qwen3-235b-a22b-2507-v1:0",
            messages: [{ role: "user", content: [{ text: prompt }] }],
            inferenceConfig: { maxTokens: 200, temperature }
        });

        try {
            console.log(`DEBUG: Generating module rubrics, attempt ${attempt}/${maxRetries}`);
            const response = await getBedrockClient().send(command);
            const content = response.output?.message?.content?.[0]?.text || "[]";
            console.log("DEBUG: Raw AI Module Rubrics Response:", content.substring(0, 200));

            // Try to parse JSON array
            const firstOpen = content.indexOf('[');
            const lastClose = content.lastIndexOf(']');

            if (firstOpen !== -1 && lastClose > firstOpen) {
                const jsonString = content.substring(firstOpen, lastClose + 1);
                const rubrics = JSON.parse(jsonString);

                if (Array.isArray(rubrics) && rubrics.length >= 3) {
                    console.log('DEBUG: Module rubrics generated:', rubrics.slice(0, 3));
                    return rubrics.slice(0, 3).map((r: any) => String(r));
                }
            }

            // Try extracting items from text
            const itemMatches = content.match(/["']([^"']+)["']/g);
            if (itemMatches && itemMatches.length >= 3) {
                const rubrics = itemMatches.slice(0, 3).map(m => m.replace(/["']/g, ''));
                console.log('DEBUG: Extracted rubrics from text:', rubrics);
                return rubrics;
            }

            lastError = 'Could not parse rubrics from response';
        } catch (e: any) {
            console.log(`DEBUG: Attempt ${attempt} failed:`, e.message);
            lastError = e.message;
        }

        if (attempt < maxRetries) {
            const delay = Math.min(5000, 500 * attempt); // Exponential backoff, max 5s
            console.log(`DEBUG: Retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }

    throw new Error(`Failed to generate module rubrics after ${maxRetries} attempts: ${lastError}`);
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
        modelId: "qwen.qwen3-235b-a22b-2507-v1:0",
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
        modelId: "qwen.qwen3-235b-a22b-2507-v1:0",
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
        modelId: "qwen.qwen3-235b-a22b-2507-v1:0",
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

// ============================================
// PRE-ASSESSMENT - Familiarity Check & Baseline
// ============================================

/**
 * Generate a pre-assessment question based on the user's job description and topic context.
 * Questions should help determine the employee's baseline knowledge.
 */
export const generatePreAssessmentQuestion = async (
    jobDescription: string,
    topicContext: string,
    history: { question: string, answer: string }[]
): Promise<string> => {
    const historyText = history.length > 0
        ? history.map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join('\n\n')
        : "No previous questions asked yet.";

    const prompt = `
    You are an expert assessor determining an employee's baseline knowledge.

    EMPLOYEE'S JOB:
    ${jobDescription.substring(0, 1500)}

    TRAINING TOPIC:
    ${topicContext.substring(0, 3000)}

    PREVIOUS Q&A:
    ${historyText}

    TASK:
    Generate ONE question to assess the employee's existing knowledge of the training topic.
    - Question should be relevant to BOTH their job role AND the training topic
    - Question should be clear and answerable in 1-3 sentences
    - If there's previous Q&A, ask something different that builds on or explores a different aspect
    - Difficulty should be appropriate for determining baseline (not too easy, not too advanced)

    IMPORTANT: Return ONLY the question text. No labels, no explanations.
    `;

    const command = new ConverseCommand({
        modelId: "qwen.qwen3-235b-a22b-2507-v1:0",
        messages: [{ role: "user", content: [{ text: prompt }] }],
        inferenceConfig: { maxTokens: 300, temperature: 0.5 }
    });

    console.log('DEBUG: Generating pre-assessment question...');
    const response = await getBedrockClient().send(command);
    let text = response.output?.message?.content?.[0]?.text || "Error generating question.";

    // Clean up any prefixes the AI might add
    const match = text.match(/(?:Question:|Here is the question:|The question is:|\[Question\])\s*(.*)/is);
    if (match && match[1]) {
        text = match[1].trim();
    }
    text = text.split(/Answer:/i)[0].trim();

    console.log('DEBUG: Generated pre-assessment question:', text);
    return text;
};

/**
 * Evaluate a pre-assessment answer and determine if more questions are needed.
 * Returns score and whether the baseline has been determined with confidence.
 */
export const evaluatePreAssessmentAnswer = async (
    question: string,
    answer: string,
    topicContext: string,
    currentQuestionCount: number
): Promise<{
    score: number;
    feedback: string;
    needsMoreQuestions: boolean;
    confidence: 'low' | 'medium' | 'high';
}> => {
    const prompt = `
    You are evaluating an employee's pre-assessment answer to determine their baseline knowledge.

    TRAINING TOPIC:
    ${topicContext.substring(0, 2000)}

    QUESTION:
    ${question}

    EMPLOYEE'S ANSWER:
    ${answer}

    CURRENT QUESTION NUMBER: ${currentQuestionCount} of max 4

    TASK:
    1. Score the answer from 0-100 based on accuracy and understanding
    2. Provide brief feedback (1-2 sentences)
    3. Determine if more questions are needed to confidently assess baseline
       - If score is very low (<30) or very high (>80), fewer questions needed
       - If score is in middle range, more questions help clarify baseline
       - Max 4 questions total
    4. Rate your confidence in determining baseline: low, medium, or high

    Return JSON:
    {
        "score": 75,
        "feedback": "Good understanding of basics, but missed some nuances.",
        "needsMoreQuestions": true,
        "confidence": "medium"
    }

    IMPORTANT: Return ONLY the valid JSON object.
    `;

    const command = new ConverseCommand({
        modelId: "qwen.qwen3-235b-a22b-2507-v1:0",
        messages: [{ role: "user", content: [{ text: prompt }] }],
        inferenceConfig: { maxTokens: 500, temperature: 0 }
    });

    console.log('DEBUG: Evaluating pre-assessment answer...');
    const response = await getBedrockClient().send(command);
    const content = response.output?.message?.content?.[0]?.text || "{}";

    try {
        const firstOpen = content.indexOf('{');
        const lastClose = content.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1) {
            const parsed = JSON.parse(content.substring(firstOpen, lastClose + 1));
            console.log('DEBUG: Pre-assessment evaluation result:', parsed);

            // Force completion after 4 questions
            if (currentQuestionCount >= 4) {
                parsed.needsMoreQuestions = false;
                parsed.confidence = 'high';
            }

            return parsed;
        }
        return JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (e) {
        console.error("Failed to parse pre-assessment evaluation. Raw content:", content);
        // Return default response on parse error
        return {
            score: 50,
            feedback: "Unable to evaluate answer.",
            needsMoreQuestions: currentQuestionCount < 2,
            confidence: 'low'
        };
    }
};

// ============================================
// ENHANCED ASSESSMENT - Micro-Scenarios & Adaptive
// ============================================

/**
 * Generate a micro-scenario (1-3 sentences) for assessment.
 * Personalizes based on job description and uses curriculum content.
 * Returns scenario, question, type (text/mcq), options if MCQ, and hint.
 */
export const generateMicroScenario = async (
    curriculum: string,
    jobDescription: string,
    difficulty: 'Easy' | 'Normal' | 'Hard',
    rubrics: { generic?: string[], department?: string[], module?: string[] },
    history: { scenario: string, question: string, answer: string }[] = []
): Promise<{
    scenario: string;
    question: string;
    type: 'text';
    hint: string;
}> => {
    const previousQuestions = history.map(h => h.question.toLowerCase());

    // Check if question is too similar to previous ones
    const isSimilar = (newQuestion: string): boolean => {
        const newLower = newQuestion.toLowerCase();
        for (const prev of previousQuestions) {
            // Check for exact match or high word overlap
            if (newLower === prev) return true;
            const newWords = new Set(newLower.split(/\s+/).filter(w => w.length > 3));
            const prevWords = new Set(prev.split(/\s+/).filter(w => w.length > 3));
            const overlap = [...newWords].filter(w => prevWords.has(w)).length;
            if (overlap >= Math.min(newWords.size, prevWords.size) * 0.7) return true;
        }
        return false;
    };

    const maxRetries = 10;
    let lastFailureReason: 'duplicate' | 'parse_failed' = 'parse_failed';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const temperature = Math.min(1.0, 0.5 + (attempt * 0.05)); // gradual increase

        const historyText = history.length > 0
            ? history.map((h) => `- "${h.question}"`).join('\n')
            : "None yet";

        const prompt = `Create a workplace scenario question for training assessment.

JOB: ${jobDescription.substring(0, 200)}
TRAINING CONTENT: ${curriculum.substring(0, 2000)}
DIFFICULTY: ${difficulty}
QUESTION NUMBER: ${history.length + 1}

ALREADY ASKED (DO NOT REPEAT OR ASK SIMILAR):
${historyText}

IMPORTANT: Create a completely DIFFERENT question. Focus on a NEW aspect of the training material not covered above.

Output ONLY valid JSON:
{"scenario":"brief workplace situation","question":"your unique question","hint":"helpful hint"}`;

        const command = new ConverseCommand({
            modelId: "qwen.qwen3-235b-a22b-2507-v1:0",
            messages: [{ role: "user", content: [{ text: prompt }] }],
            inferenceConfig: { maxTokens: 500, temperature }
        });

        console.log(`DEBUG: Generating scenario, attempt ${attempt}/${maxRetries}, temp=${temperature}`);
        const response = await getBedrockClient().send(command);
        const content = response.output?.message?.content?.[0]?.text || "{}";
        console.log('DEBUG: Raw AI response:', content.substring(0, 150));

        try {
            // Try JSON parsing
            const firstOpen = content.indexOf('{');
            const lastClose = content.lastIndexOf('}');
            if (firstOpen !== -1 && lastClose !== -1) {
                const parsed = JSON.parse(content.substring(firstOpen, lastClose + 1));
                if (parsed.scenario && parsed.question) {
                    // Check for duplicates
                    if (history.length > 0 && isSimilar(parsed.question)) {
                        console.log('DEBUG: Question too similar, retrying...');
                        continue;
                    }
                    console.log('DEBUG: Unique question generated:', parsed.question.substring(0, 50));
                    return {
                        scenario: parsed.scenario,
                        question: parsed.question,
                        type: 'text',
                        hint: parsed.hint || 'Think about how this applies to your daily work.'
                    }
                }
            }
        } catch (e) {
            console.log('DEBUG: JSON parse failed, trying regex extraction');
        }

        // Text extraction with multiple patterns
        let scenario = '';
        let question = '';
        let hint = '';

        // Pattern 1: labeled fields
        const scenarioMatch = content.match(/scenario[:\s\-]*["']?([^"'\n]+)/i) ||
            content.match(/situation[:\s\-]*["']?([^"'\n]+)/i) ||
            content.match(/\*\*scenario\*\*[:\s]*([^\n]+)/i);
        const questionMatch = content.match(/question[:\s\-]*["']?([^"']+?)(?:\n|$|")/i) ||
            content.match(/\*\*question\*\*[:\s]*([^\n]+)/i);
        const hintMatch = content.match(/hint[:\s\-]*["']?([^"'\n]+)/i);

        if (scenarioMatch) scenario = scenarioMatch[1].trim().replace(/["\*]/g, '');
        if (questionMatch) question = questionMatch[1].trim().replace(/["\*]/g, '');
        if (hintMatch) hint = hintMatch[1].trim();

        // Pattern 2: If no labeled fields, try to find any question-like sentence (ends with ?)
        if (!question) {
            const questionSentence = content.match(/([A-Z][^.!?]*\?)/);
            if (questionSentence) {
                question = questionSentence[1].trim();
            }
        }

        // Pattern 3: If we have a question but no scenario, use the first sentence
        if (question && !scenario) {
            const firstSentence = content.match(/^[^.!?]+[.!?]/m);
            if (firstSentence && firstSentence[0] !== question) {
                scenario = firstSentence[0].trim();
            }
        }

        // Pattern 4: Split content into lines and try to find scenario/question
        if (!scenario || !question) {
            const lines = content.split('\n').filter(l => l.trim().length > 10);
            if (lines.length >= 2) {
                if (!scenario) scenario = lines[0].replace(/^[\d\.\-\*\s]+/, '').trim();
                if (!question) {
                    // Find a line with a question mark or use second line
                    const questionLine = lines.find(l => l.includes('?')) || lines[1];
                    question = questionLine.replace(/^[\d\.\-\*\s]+/, '').trim();
                }
            }
        }

        if (scenario && question && scenario.length > 5 && question.length > 10) {
            if (history.length > 0 && isSimilar(question)) {
                console.log('DEBUG: Extracted question too similar, retrying...');
                lastFailureReason = 'duplicate';
                continue;
            }
            console.log('DEBUG: Successfully extracted scenario and question');
            return {
                scenario: scenario.substring(0, 200),
                question: question.substring(0, 300),
                type: 'text',
                hint: hint || 'Consider applying what you learned in the training.'
            };
        }

        // Neither JSON nor regex worked
        lastFailureReason = 'parse_failed';
        console.log('DEBUG: Could not extract scenario/question from response. Content:', content.substring(0, 200));
    }

    // No fallback - throw error with actual reason
    const errorMsg = lastFailureReason === 'duplicate'
        ? `Failed to generate unique question after ${maxRetries} attempts. All generated questions were too similar to previous ones.`
        : `Failed to generate question after ${maxRetries} attempts. AI responses could not be parsed.`;
    throw new Error(errorMsg);
};

/**
 * Evaluate an answer using the provided rubrics.
 * Returns score, feedback, and whether answer is correct.
 */
export const evaluateWithRubrics = async (
    scenario: string,
    question: string,
    answer: string,
    correctAnswer: string | number | undefined,
    rubrics: { generic?: string[], department?: string[], module?: string[] },
    curriculum: string,
    questionType: 'text' | 'mcq'
): Promise<{
    score: number;
    isCorrect: boolean;
    feedback: string;
    rubricScores: { generic: number, department: number, module: number };
}> => {
    // Ultra-simple prompt - just ask for a score
    const prompt = `Rate this answer 0-100 and give brief feedback.

Q: ${question.substring(0, 100)}
A: ${answer.substring(0, 200)}

Reply ONLY with: {"score":NUMBER,"feedback":"TEXT"}`;

    const maxRetries = 10;
    let lastContent = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`DEBUG: Evaluating answer, attempt ${attempt}/${maxRetries}`);

            const command = new ConverseCommand({
                modelId: "qwen.qwen3-235b-a22b-2507-v1:0",
                messages: [{ role: "user", content: [{ text: prompt }] }],
                inferenceConfig: { maxTokens: 200, temperature: 0 }
            });

            const response = await getBedrockClient().send(command);
            lastContent = response.output?.message?.content?.[0]?.text || "";
            console.log('DEBUG: Raw evaluation response:', lastContent.substring(0, 150));

            // Try to extract score from various formats
            let score = 50; // Default
            let feedback = 'Answer received.';

            // Try JSON parsing first
            const jsonMatch = lastContent.match(/\{[^}]+\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.score !== undefined) {
                        score = Number(parsed.score) || 50;
                    }
                    if (parsed.feedback) {
                        feedback = String(parsed.feedback);
                    }
                } catch (e) {
                    // JSON parse failed, try regex
                }
            }

            // Try regex extraction if JSON failed
            if (score === 50) {
                const scoreMatch = lastContent.match(/score["\s:]+(\d+)/i) ||
                    lastContent.match(/(\d+)\s*(?:out of|\/)\s*100/i) ||
                    lastContent.match(/(\d+)%/);
                if (scoreMatch) {
                    score = parseInt(scoreMatch[1], 10);
                }
            }

            // Extract feedback if not found
            if (feedback === 'Answer received.') {
                const feedbackMatch = lastContent.match(/feedback["\s:]+["']?([^"'\n]+)/i);
                if (feedbackMatch) {
                    feedback = feedbackMatch[1].trim();
                } else if (lastContent.length > 20) {
                    // Use part of the response as feedback
                    feedback = lastContent.replace(/[{}"]/g, '').substring(0, 150).trim();
                }
            }

            // Ensure score is in valid range
            score = Math.max(0, Math.min(100, score));
            const isCorrect = score >= 60;

            console.log('DEBUG: Evaluation result - Score:', score);
            return {
                score,
                isCorrect,
                feedback: feedback || 'Thank you for your answer.',
                rubricScores: { generic: score, department: score, module: score }
            };

        } catch (e: any) {
            console.log(`DEBUG: Attempt ${attempt} failed:`, e.message);
        }

        // Wait before retry with exponential backoff
        if (attempt < maxRetries) {
            const delay = Math.min(5000, 300 * attempt);
            console.log(`DEBUG: Retrying evaluation in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }

    // No fallback - throw error if all retries fail
    throw new Error(`Failed to evaluate answer after ${maxRetries} attempts`);
};

/**
 * Generate personalized feedback after completing an assessment.
 * Summarizes performance, identifies strengths/weaknesses, and provides recommendations.
 */
export const generatePersonalizedFeedback = async (
    jobDescription: string,
    answers: { scenario: string, question: string, answer: string, score: number, feedback: string }[],
    rubrics: { generic?: string[], department?: string[], module?: string[] },
    overallScore: number
): Promise<{
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
}> => {
    const avgScore = answers.reduce((s, a) => s + a.score, 0) / answers.length;
    const goodAnswers = answers.filter(a => a.score >= 70);
    const weakAnswers = answers.filter(a => a.score < 50);

    // Simplified prompt - much more direct
    const prompt = `Generate assessment feedback as JSON.

Job: ${jobDescription.substring(0, 200)}
Score: ${overallScore}%
Good answers: ${goodAnswers.length}/${answers.length}
Topics done well: ${goodAnswers.slice(0, 2).map(a => a.question.substring(0, 50)).join('; ')}
Topics to improve: ${weakAnswers.slice(0, 2).map(a => a.question.substring(0, 50)).join('; ')}

Output ONLY this JSON:
{"summary":"2 sentence performance summary","strengths":["strength1","strength2"],"weaknesses":["weakness1"],"recommendations":["recommendation1","recommendation2"]}`;

    const maxRetries = 10;
    let lastError = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`DEBUG: Generating feedback, attempt ${attempt}/${maxRetries}`);

            const command = new ConverseCommand({
                modelId: "qwen.qwen3-235b-a22b-2507-v1:0",
                messages: [{ role: "user", content: [{ text: prompt }] }],
                inferenceConfig: { maxTokens: 400, temperature: 0.4 }
            });

            const response = await getBedrockClient().send(command);
            const content = response.output?.message?.content?.[0]?.text || "";
            console.log('DEBUG: Raw feedback response:', content.substring(0, 150));

            // Extract JSON
            const firstOpen = content.indexOf('{');
            const lastClose = content.lastIndexOf('}');
            if (firstOpen !== -1 && lastClose !== -1) {
                const jsonStr = content.substring(firstOpen, lastClose + 1);
                const parsed = JSON.parse(jsonStr);

                // Validate required fields
                if (parsed.summary && Array.isArray(parsed.strengths) && Array.isArray(parsed.recommendations)) {
                    console.log('DEBUG: Successfully generated feedback');
                    return {
                        summary: parsed.summary,
                        strengths: parsed.strengths || [],
                        weaknesses: parsed.weaknesses || [],
                        recommendations: parsed.recommendations || []
                    };
                }
            }
            lastError = 'Invalid JSON structure';
        } catch (e: any) {
            lastError = e.message;
            console.log(`DEBUG: Attempt ${attempt} failed:`, lastError);
        }

        // Wait before retry with exponential backoff
        if (attempt < maxRetries) {
            const delay = Math.min(5000, 500 * attempt);
            console.log(`DEBUG: Retrying feedback generation in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }

    throw new Error(`Failed to generate feedback after ${maxRetries} attempts: ${lastError}`);
};
