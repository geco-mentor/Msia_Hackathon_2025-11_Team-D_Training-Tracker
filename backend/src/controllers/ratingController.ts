import { Request, Response } from 'express';
import { supabase } from '../config/database';
import { AuthRequest } from '../middleware/auth';

/**
 * Submit a course rating
 */
export const submitRating = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { scenarioId, rating, review } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        if (!scenarioId || !rating || rating < 1 || rating > 5) {
            res.status(400).json({ success: false, message: 'Invalid rating. Must be 1-5 stars.' });
            return;
        }

        // Check if user has completed this course
        const { data: assessment } = await supabase
            .from('assessments')
            .select('id')
            .eq('user_id', userId)
            .eq('scenario_id', scenarioId)
            .eq('completed', true)
            .single();

        if (!assessment) {
            res.status(403).json({
                success: false,
                message: 'You must complete the course before rating it.'
            });
            return;
        }

        // Upsert rating (update if exists, insert if not)
        const { data, error } = await supabase
            .from('course_ratings')
            .upsert({
                user_id: userId,
                scenario_id: scenarioId,
                rating,
                review: review || null
            }, {
                onConflict: 'user_id,scenario_id'
            })
            .select()
            .single();

        if (error) throw error;

        console.log('Rating submitted:', { userId, scenarioId, rating });
        res.status(200).json({
            success: true,
            message: 'Rating submitted successfully',
            rating: data
        });

    } catch (error: any) {
        console.error('Error submitting rating:', error);
        res.status(500).json({ success: false, message: 'Failed to submit rating' });
    }
};

/**
 * Get course rating summary (average and count)
 */
export const getRatingSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const { scenarioId } = req.params;

        if (!scenarioId) {
            res.status(400).json({ success: false, message: 'Scenario ID required' });
            return;
        }

        // Get all ratings for this scenario
        const { data: ratings, error } = await supabase
            .from('course_ratings')
            .select('rating')
            .eq('scenario_id', scenarioId);

        if (error) throw error;

        const count = ratings?.length || 0;
        const average = count > 0
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / count
            : 0;

        res.status(200).json({
            success: true,
            data: {
                averageRating: Math.round(average * 10) / 10, // Round to 1 decimal
                totalRatings: count,
                distribution: count > 0 ? {
                    5: ratings.filter(r => r.rating === 5).length,
                    4: ratings.filter(r => r.rating === 4).length,
                    3: ratings.filter(r => r.rating === 3).length,
                    2: ratings.filter(r => r.rating === 2).length,
                    1: ratings.filter(r => r.rating === 1).length
                } : null
            }
        });

    } catch (error: any) {
        console.error('Error fetching rating summary:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch rating summary' });
    }
};

/**
 * Get all reviews for a course
 */
export const getCourseReviews = async (req: Request, res: Response): Promise<void> => {
    try {
        const { scenarioId } = req.params;

        if (!scenarioId) {
            res.status(400).json({ success: false, message: 'Scenario ID required' });
            return;
        }

        const { data: reviews, error } = await supabase
            .from('course_ratings')
            .select(`
                id,
                rating,
                review,
                created_at,
                employees (
                    name,
                    department
                )
            `)
            .eq('scenario_id', scenarioId)
            .not('review', 'is', null)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        res.status(200).json({
            success: true,
            data: reviews?.map((r: any) => ({
                id: r.id,
                rating: r.rating,
                review: r.review,
                createdAt: r.created_at,
                author: r.employees?.name || 'Anonymous',
                department: r.employees?.department || 'Unknown'
            })) || []
        });

    } catch (error: any) {
        console.error('Error fetching course reviews:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
    }
};

/**
 * Get user's rating for a specific course
 */
export const getUserRating = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { scenarioId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { data: rating, error } = await supabase
            .from('course_ratings')
            .select('*')
            .eq('user_id', userId)
            .eq('scenario_id', scenarioId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            throw error;
        }

        res.status(200).json({
            success: true,
            data: rating || null
        });

    } catch (error: any) {
        console.error('Error fetching user rating:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user rating' });
    }
};
