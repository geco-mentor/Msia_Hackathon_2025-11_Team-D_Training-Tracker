import { Request, Response } from 'express';
import * as challengeService from '../services/challengeService';

export const generate = async (req: Request, res: Response) => {
    try {
        const { jobTitle, difficulty, userId, isPersonalized } = req.body;

        if (!jobTitle || !difficulty) {
            return res.status(400).json({ success: false, message: 'Job title and difficulty are required' });
        }

        const challenge = await challengeService.generateChallenge(jobTitle, difficulty, userId, isPersonalized);
        res.status(200).json({ success: true, data: challenge });
    } catch (error: any) {
        console.error('Controller error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getMain = async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string | undefined;
        console.log('DEBUG: getMain called with userId:', userId);
        const challenges = await challengeService.getMainChallenges(userId);
        res.status(200).json({ success: true, data: challenges });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getPersonalized = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }
        const challenges = await challengeService.getPersonalizedChallenges(userId);
        res.status(200).json({ success: true, data: challenges });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteQuest = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await challengeService.deleteChallenge(id);
        res.status(200).json({ success: true, message: 'Challenge deleted' });
    } catch (error: any) {
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
