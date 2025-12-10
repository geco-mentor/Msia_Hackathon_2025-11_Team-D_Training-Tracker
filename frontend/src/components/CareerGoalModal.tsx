import React, { useState } from 'react';
import { X, Target, Loader, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface CareerGoalModalProps {
    userId: string;
    onClose: () => void;
    onGoalCreated: () => void;
}

export const CareerGoalModal: React.FC<CareerGoalModalProps> = ({
    userId,
    onClose,
    onGoalCreated
}) => {
    const [goalTitle, setGoalTitle] = useState('');
    const [goalDescription, setGoalDescription] = useState('');
    const [targetTimeframe, setTargetTimeframe] = useState('5 years');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!goalTitle.trim()) {
            setError('Please enter your career goal');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            console.log('[CareerGoalModal] Creating goal:', goalTitle);

            const response = await fetch(`${API_BASE_URL}/api/career-goals`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId,
                    goalTitle: goalTitle.trim(),
                    goalDescription: goalDescription.trim() || null,
                    targetTimeframe
                })
            });

            const data = await response.json();
            console.log('[CareerGoalModal] Response:', data);

            if (data.success) {
                onGoalCreated();
                onClose();
            } else {
                setError(data.message || 'Failed to create career goal');
            }
        } catch (err: any) {
            console.error('[CareerGoalModal] Error:', err);
            setError(err.message || 'Failed to create career goal');
        } finally {
            setLoading(false);
        }
    };

    const exampleGoals = [
        'Hiring Manager',
        'Senior Engineer',
        'Team Lead',
        'Department Head',
        'Technical Architect',
        'Principal Consultant'
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="theme-bg-secondary border theme-border rounded-lg w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b theme-border">
                    <h2 className="text-lg font-bold theme-text-primary flex items-center gap-2">
                        <Target size={18} className="text-cyan-400" />
                        Set Your Career Goal
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:theme-text-primary transition-colors"
                        disabled={loading}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Main question */}
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
                            Where do you see yourself in 5 years?
                        </h3>
                        <p className="text-sm theme-text-secondary">
                            Tell us your career aspiration and we'll generate a personalized roadmap
                        </p>
                    </div>

                    {/* Goal Title */}
                    <div>
                        <label className="text-xs theme-text-muted uppercase tracking-wider block mb-2">
                            Your Career Goal *
                        </label>
                        <input
                            type="text"
                            value={goalTitle}
                            onChange={(e) => setGoalTitle(e.target.value)}
                            placeholder="e.g., Hiring Manager, Senior Engineer..."
                            className="w-full px-4 py-3 bg-black/20 border theme-border rounded-lg theme-text-primary focus:border-cyan-500 focus:outline-none transition-colors"
                            disabled={loading}
                        />
                        {/* Example chips */}
                        <div className="flex flex-wrap gap-2 mt-2">
                            {exampleGoals.map((example) => (
                                <button
                                    key={example}
                                    type="button"
                                    onClick={() => setGoalTitle(example)}
                                    className="px-2 py-1 text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/20 transition-colors"
                                >
                                    {example}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs theme-text-muted uppercase tracking-wider block mb-2">
                            Why this goal? (Optional)
                        </label>
                        <textarea
                            value={goalDescription}
                            onChange={(e) => setGoalDescription(e.target.value)}
                            placeholder="Describe what motivates you towards this goal..."
                            rows={3}
                            className="w-full px-4 py-3 bg-black/20 border theme-border rounded-lg theme-text-primary focus:border-cyan-500 focus:outline-none transition-colors resize-none"
                            disabled={loading}
                        />
                    </div>

                    {/* Timeframe */}
                    <div>
                        <label className="text-xs theme-text-muted uppercase tracking-wider block mb-2">
                            Target Timeframe
                        </label>
                        <select
                            value={targetTimeframe}
                            onChange={(e) => setTargetTimeframe(e.target.value)}
                            className="w-full px-4 py-3 bg-black/20 border theme-border rounded-lg theme-text-primary focus:border-cyan-500 focus:outline-none transition-colors"
                            disabled={loading}
                        >
                            <option value="1 year">1 Year</option>
                            <option value="2 years">2 Years</option>
                            <option value="3 years">3 Years</option>
                            <option value="5 years">5 Years</option>
                        </select>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={loading || !goalTitle.trim()}
                        className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold rounded-lg hover:from-cyan-400 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader size={18} className="animate-spin" />
                                Generating Your Roadmap...
                            </>
                        ) : (
                            <>
                                <Sparkles size={18} />
                                Generate Career Roadmap
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
