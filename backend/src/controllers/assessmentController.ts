import { Request, Response } from 'express';
import { supabase } from '../config/database';
import { generateUploadUrl, extractTextFromPdf, readTextFile, saveTextToS3, generateRubricsFromText } from '../services/awsService';

export const getUploadUrl = async (req: Request, res: Response) => {
    try {
        const { fileName, contentType, userId } = req.body;
        console.log('DEBUG: getUploadUrl called with:', { fileName, contentType, userId });

        if (!fileName || !contentType || !userId) {
            console.log('DEBUG: Missing required fields');
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const bucket = process.env.AWS_S3_BUCKET_NAME;
        if (!bucket) {
            console.error('ERROR: AWS_S3_BUCKET_NAME is not set in environment variables');
            return res.status(500).json({ message: 'Server configuration error: S3 bucket not configured' });
        }

        const key = `uploads/${userId}/${Date.now()}-${fileName}`;
        console.log('DEBUG: Generating upload URL for bucket:', bucket, 'key:', key);

        const uploadUrl = await generateUploadUrl(bucket, key, contentType);
        console.log('DEBUG: Upload URL generated successfully');

        res.json({
            uploadUrl,
            key
        });
    } catch (error: any) {
        console.error('Error generating upload URL:', error);
        console.error('Error stack:', error.stack);

        try {
            const fs = require('fs');
            const path = require('path');
            const logPath = path.resolve(__dirname, '../../upload_error.log');
            fs.appendFileSync(logPath, `${new Date().toISOString()} - ERROR in getUploadUrl: ${error.message}\nStack: ${error.stack}\nBucket Env: ${process.env.AWS_S3_BUCKET_NAME}\nRegion Env: ${process.env.AWS_S3_REGION}\n`);
        } catch (logErr) {
            console.error('Failed to write debug log', logErr);
        }

        res.status(500).json({ message: 'Failed to generate upload URL', error: error.message });
    }
};

export const processFile = async (req: Request, res: Response) => {
    try {
        console.log('=== PROCESS FILE START ===');
        console.log('DEBUG: processFile called with body:', JSON.stringify(req.body));
        const { key, userId, departmentIds, postAssessmentDate } = req.body;

        if (!key || !userId || !departmentIds || !Array.isArray(departmentIds) || departmentIds.length === 0 || !postAssessmentDate) {
            console.log('DEBUG: Missing required fields');
            return res.status(400).json({ message: 'Missing required fields: key, userId, departmentIds (array), postAssessmentDate' });
        }

        const bucket = process.env.AWS_S3_BUCKET_NAME;
        if (!bucket) {
            console.error('ERROR: AWS_S3_BUCKET_NAME not set!');
            return res.status(500).json({ message: 'Server config error: S3 bucket not set' });
        }
        console.log('DEBUG: Using bucket:', bucket);

        let text = '';

        // Step 1: Extract text
        console.log('DEBUG: Step 1 - Extracting text from file:', key);
        if (key.endsWith('.pdf')) {
            console.log('DEBUG: File is PDF, using extractTextFromPdf...');
            text = await extractTextFromPdf(bucket, key);
        } else {
            console.log('DEBUG: File is text, using readTextFile...');
            text = await readTextFile(bucket, key);
        }
        console.log('DEBUG: Step 1 COMPLETE - Extracted', text.length, 'characters');

        // Step 2: Save extracted text to S3
        const originalFileName = key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'document';
        const extractedTextKey = `extracted-text/${userId}/${Date.now()}-${originalFileName}.txt`;
        console.log('DEBUG: Step 2 - Saving extracted text to S3:', extractedTextKey);
        await saveTextToS3(bucket, extractedTextKey, text);
        console.log('DEBUG: Step 2 COMPLETE - Saved extracted text to S3');

        // Step 3: Generate rubrics ONLY (no full scenario)
        // Pass all department IDs for combined rubrics from all selected departments
        console.log('DEBUG: Step 3 - Generating rubrics with AI...');
        const rubric = await generateRubricsFromText(text, departmentIds);
        console.log('DEBUG: Step 3 COMPLETE - Generated rubrics:', JSON.stringify(rubric, null, 2));

        // Step 4: Check if userId is an employee (creator_id FK references employees)
        console.log('DEBUG: Step 4 - Checking if userId is an employee...');
        const { data: employeeCheck } = await supabase
            .from('employees')
            .select('id')
            .eq('id', userId)
            .single();

        const creatorId = employeeCheck?.id || null;  // Only set if user is employee
        console.log('DEBUG: Creator ID resolved to:', creatorId, '(null means admin upload)');

        // Step 5: Insert into database
        console.log('DEBUG: Step 5 - Inserting into database...');
        // Generate unique title from filename: remove timestamp prefix (e.g., "1765289516887-genai" -> "genai")
        // Then add a short unique suffix to ensure uniqueness
        const cleanFileName = originalFileName
            .replace(/^\d+-/, '')  // Remove leading timestamp prefix like "1765289516887-"
            .replace(/_/g, ' ')    // Replace underscores with spaces
            .trim();
        const uniqueSuffix = Date.now().toString(36).slice(-4);  // Short 4-char suffix
        const title = `${cleanFileName || 'Training Module'} (${uniqueSuffix})`;

        const insertData = {
            title: title,
            scenario_text: text.substring(0, 5000),  // Store first 5000 chars of extracted text
            task: '',
            difficulty: 'Normal',
            rubric: rubric,
            hint: '',
            creator_id: creatorId,  // null for admin, employee ID for employees
            source_file: key,
            extracted_text_file: extractedTextKey,
            status: 'published',  // Published immediately so employees can see it
            type: 'text',
            category: 'Training',
            skill: 'General',
            department_ids: departmentIds,  // Array of department IDs
            post_assessment_date: postAssessmentDate
        };
        console.log('DEBUG: Insert data:', JSON.stringify(insertData, null, 2));

        const { data, error } = await supabase
            .from('scenarios')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('DEBUG: Database insert error:', error);
            throw error;
        }

        console.log('DEBUG: Step 5 COMPLETE - Inserted scenario ID:', data.id);
        console.log('=== PROCESS FILE SUCCESS ===');

        res.json({
            message: 'File processed and rubrics generated successfully',
            scenario: {
                id: data.id,
                rubric: data.rubric,
                extracted_text_file: data.extracted_text_file,
                source_file: data.source_file,
                department_ids: data.department_ids,
                post_assessment_date: data.post_assessment_date
            }
        });

    } catch (error: any) {
        console.error('=== PROCESS FILE ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code || error.Code);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Failed to process file', error: error.message });
    }
};

export const getDepartments = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('departments')
            .select('*')
            .order('name');

        if (error) throw error;

        res.json(data);
    } catch (error: any) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ message: 'Failed to fetch departments', error: error.message });
    }
};
