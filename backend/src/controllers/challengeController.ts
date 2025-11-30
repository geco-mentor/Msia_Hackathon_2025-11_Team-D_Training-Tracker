import { Request, Response } from 'express';
import * as challengeService from '../services/challengeService';

export const generate = async (req: Request, res: Response) => {
    try {
        const { jobTitle, difficulty } = req.body;

        if (!jobTitle || !difficulty) {
            return res.status(400).json({ success: false, message: 'Job title and difficulty are required' });
        }

        const challenge = await challengeService.generateChallenge(jobTitle, difficulty);
        res.status(200).json({ success: true, data: challenge });
    } catch (error: any) {
        console.error('Controller error:', error);
        try {
            const fs = require('fs');
            const path = require('path');
            const logPath = path.resolve(__dirname, '../../server_error.log');
            fs.appendFileSync(logPath, `${new Date().toISOString()} - CHALLENGE ERROR: ${error.stack || error.message}\n`);
        } catch (e) { console.error('Log error', e); }
        res.status(500).json({ success: false, message: error.message });
    }
};

export const submit = async (req: Request, res: Response) => {
    try {
        const { scenarioId, userResponse, userId } = req.body;

        if (!scenarioId || !userResponse || !userId) {
            return res.status(400).json({ success: false, message: 'Scenario ID, user response, and user ID are required' });
        }

        const result = await challengeService.evaluateResponse(scenarioId, userResponse, userId);
        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        console.error('Controller error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
