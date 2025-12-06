import { Request, Response } from 'express';
import { supabase } from '../config/database';
import { generateUploadUrl, extractTextFromPdf, readTextFile, generateScenarioFromText } from '../services/awsService';

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
        const { key, userId, departmentId, postAssessmentDate } = req.body;

        if (!key || !userId || !departmentId || !postAssessmentDate) {
            console.log('DEBUG: Missing required fields');
            return res.status(400).json({ message: 'Missing required fields: key, userId, departmentId, postAssessmentDate' });
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

        // Step 2: Fetch department
        console.log('DEBUG: Step 2 - Fetching department:', departmentId);
        const { data: deptData, error: deptError } = await supabase
            .from('departments')
            .select('name')
            .eq('id', departmentId)
            .single();

        if (deptError) {
            console.error('DEBUG: Department fetch error:', deptError);
        }
        const departmentName = deptData?.name || 'General';
        console.log('DEBUG: Step 2 COMPLETE - Department:', departmentName);

        // Step 3: Generate rubrics with AI (only module rubrics are AI-generated)
        console.log('DEBUG: Step 3 - Generating rubrics with AI...');
        const generatedScenario = await generateScenarioFromText(text, departmentName, departmentId);
        console.log('DEBUG: Step 3 COMPLETE - Generated scenario:', JSON.stringify(generatedScenario, null, 2));

        // Step 4: Insert into database
        console.log('DEBUG: Step 4 - Inserting into database...');
        const insertData = {
            title: generatedScenario.title,
            scenario_text: generatedScenario.scenario_text,
            task: generatedScenario.task,
            difficulty: generatedScenario.difficulty,
            rubric: generatedScenario.rubric,
            hint: generatedScenario.hint,
            creator_id: userId,
            source_file: key,
            status: 'draft',
            type: 'text',
            category: generatedScenario.category || 'Training',
            skill: 'General',
            department_id: departmentId,
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

        console.log('DEBUG: Step 4 COMPLETE - Inserted scenario ID:', data.id);
        console.log('=== PROCESS FILE SUCCESS ===');

        res.json({
            message: 'File processed and scenario created successfully',
            scenario: data
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
