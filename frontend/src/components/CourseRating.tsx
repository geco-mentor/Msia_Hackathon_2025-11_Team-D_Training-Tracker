import React, { useState, useEffect } from 'react';
import { Star, Send, MessageSquare } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface RatingSummary {
    averageRating: number;
    totalRatings: number;
    distribution: { [key: number]: number } | null;
}

interface CourseRatingProps {
    scenarioId: string;
    showSubmitForm?: boolean;
    size?: 'small' | 'medium' | 'large';
    onRatingSubmitted?: () => void;
}

export const CourseRating: React.FC<CourseRatingProps> = ({
    scenarioId,
    showSubmitForm = false,
    size = 'medium',
    onRatingSubmitted
}) => {
    const [summary, setSummary] = useState<RatingSummary | null>(null);
    const [userRating, setUserRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [review, setReview] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sizeClasses = {
        small: { star: 12, text: 'text-xs' },
        medium: { star: 16, text: 'text-sm' },
        large: { star: 20, text: 'text-base' }
    };

    const currentSize = sizeClasses[size];

    useEffect(() => {
        fetchRatingSummary();
    }, [scenarioId]);

    const fetchRatingSummary = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/ratings/summary/${scenarioId}`);
            const data = await response.json();
            if (data.success) {
                setSummary(data.data);
            }
        } catch (err) {
            console.error('Error fetching rating summary:', err);
        }
    };

    const handleSubmitRating = async () => {
        if (userRating === 0) {
            setError('Please select a rating');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/ratings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    scenarioId,
                    rating: userRating,
                    review: review.trim() || undefined
                })
            });

            const data = await response.json();
            if (data.success) {
                setSubmitted(true);
                fetchRatingSummary();
                onRatingSubmitted?.();
            } else {
                setError(data.message || 'Failed to submit rating');
            }
        } catch (err) {
            setError('Failed to submit rating');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStars = (rating: number, interactive = false) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= (interactive ? (hoverRating || userRating) : rating);
                    const isPartial = !Number.isInteger(rating) &&
                        star === Math.ceil(rating) &&
                        star > rating &&
                        !interactive;

                    return (
                        <button
                            key={star}
                            type="button"
                            className={`transition-all ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
                            onMouseEnter={() => interactive && setHoverRating(star)}
                            onMouseLeave={() => interactive && setHoverRating(0)}
                            onClick={() => interactive && setUserRating(star)}
                            disabled={!interactive}
                        >
                            <Star
                                size={currentSize.star}
                                className={`${isFilled
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : isPartial
                                            ? 'text-yellow-400 fill-yellow-400/50'
                                            : 'text-gray-500'
                                    }`}
                            />
                        </button>
                    );
                })}
            </div>
        );
    };

    // Display-only mode (for cards)
    if (!showSubmitForm) {
        return (
            <div className={`flex items-center gap-2 ${currentSize.text}`}>
                {summary && summary.totalRatings > 0 ? (
                    <>
                        {renderStars(summary.averageRating)}
                        <span className="text-yellow-400 font-bold">
                            {summary.averageRating.toFixed(1)}
                        </span>
                        <span className="theme-text-muted">
                            ({summary.totalRatings} {summary.totalRatings === 1 ? 'review' : 'reviews'})
                        </span>
                    </>
                ) : (
                    <span className="theme-text-muted">No ratings yet</span>
                )}
            </div>
        );
    }

    // Submit form mode
    return (
        <div className="theme-bg-tertiary rounded-lg p-6 border theme-border">
            <h3 className="text-lg font-bold theme-text-primary mb-4 flex items-center gap-2">
                <MessageSquare size={18} className="text-yellow-400" />
                Rate This Course
            </h3>

            {submitted ? (
                <div className="text-center py-6">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                        <Star size={32} className="text-green-400 fill-green-400" />
                    </div>
                    <p className="text-green-400 font-bold mb-2">Thanks for your feedback!</p>
                    <p className="theme-text-secondary text-sm">Your rating helps others choose the right training.</p>
                </div>
            ) : (
                <>
                    {/* Star Rating */}
                    <div className="mb-6">
                        <label className="block text-sm theme-text-secondary mb-2">Your Rating</label>
                        <div className="flex items-center gap-3">
                            {renderStars(userRating, true)}
                            {userRating > 0 && (
                                <span className="text-yellow-400 font-bold">{userRating}/5</span>
                            )}
                        </div>
                    </div>

                    {/* Review Text */}
                    <div className="mb-6">
                        <label className="block text-sm theme-text-secondary mb-2">
                            Review (optional)
                        </label>
                        <textarea
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            placeholder="Share your experience with this training..."
                            className="w-full px-4 py-3 bg-black/30 border theme-border rounded-lg theme-text-primary placeholder:theme-text-muted focus:outline-none focus:border-yellow-500/50 resize-none"
                            rows={3}
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmitRating}
                        disabled={isSubmitting || userRating === 0}
                        className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Send size={16} />
                        {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                    </button>
                </>
            )}

            {/* Current Stats */}
            {summary && summary.totalRatings > 0 && (
                <div className="mt-6 pt-6 border-t theme-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {renderStars(summary.averageRating)}
                            <span className="text-yellow-400 font-bold">{summary.averageRating.toFixed(1)}</span>
                        </div>
                        <span className="theme-text-muted text-sm">
                            {summary.totalRatings} total {summary.totalRatings === 1 ? 'rating' : 'ratings'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};
