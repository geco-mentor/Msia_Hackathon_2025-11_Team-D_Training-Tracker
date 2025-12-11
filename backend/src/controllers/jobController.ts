import { Request, Response } from 'express';
import { model } from '../services/aiService';

export const analyzeJob = async (req: Request, res: Response) => {
    try {
        const { jobTitle } = req.body;

        if (!jobTitle) {
            return res.status(400).json({ success: false, message: 'Job title is required' });
        }

        const prompt = `
            Analyze the job title "${jobTitle}" and identify the top 5-7 GenAI (Generative AI) skills relevant to this role.
            Focus on basic to intermediate skills that can be tested with text-based scenarios.

            Return ONLY a valid JSON object with this structure (no markdown formatting):
            {
                "job_title": "${jobTitle}",
                "skills": [
                    {
                        "name": "Skill Name",
                        "description": "Brief description of why this is important for the role.",
                        "category": "Category (e.g., Prompt Engineering, Content Creation, Data Analysis)"
                    }
                ]
            }
        `;

        const result = await model.generateContent(prompt);
        const responseText = await result.response.text();
        console.log('Raw AI Response:', responseText);

        // Clean up markdown code blocks if present
        let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        // Extract JSON object if there's extra text
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanText = jsonMatch[0];
        }

        const data = JSON.parse(cleanText);

        res.status(200).json({ success: true, data });

    } catch (error: any) {
        console.error('Job analysis error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to analyze job' });
    }
};
