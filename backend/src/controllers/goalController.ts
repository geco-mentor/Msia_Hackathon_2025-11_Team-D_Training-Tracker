import { Request, Response } from 'express';
import * as goalService from '../services/goalService';

export const generate = async (req: Request, res: Response) => {
    try {
        const { keyword, userId } = req.body;

        if (!keyword || !userId) {
            return res.status(400).json({ success: false, message: 'Keyword and user ID are required' });
        }

        const goals = await goalService.generateGoals(keyword, userId);
        res.status(200).json({ success: true, data: goals });
    } catch (error: any) {
        console.error('Controller error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getGoals = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const goals = await goalService.getUserGoals(userId);
        res.status(200).json({ success: true, data: goals });
    } catch (error: any) {
        console.error('Controller error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { completed } = req.body;

        if (completed === undefined) {
            return res.status(400).json({ success: false, message: 'Completed status is required' });
        }

        const goal = await goalService.updateGoalStatus(id, completed);
        res.status(200).json({ success: true, data: goal });
    } catch (error: any) {
        console.error('Controller error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
