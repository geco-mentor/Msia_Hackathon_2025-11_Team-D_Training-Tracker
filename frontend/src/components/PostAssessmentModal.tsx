import React, { useState, useEffect } from 'react';
import { X, Loader, CheckCircle, Send, Lightbulb, Star, ArrowRight, Trophy, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import { fetchWithRetry } from '../api/apiRetry';

interface PostAssessmentModalProps {
    scenario: any;
    onClose: () => void;
    onComplete: (score: number) => void;
}

interface PersonalizedFeedback {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
}

type Difficulty = 'Easy' | 'Normal' | 'Hard';

export const PostAssessmentModal: React.FC<PostAssessmentModalProps> = ({ scenario, onClose, onComplete }) => {
    const { user } = useAuth();
    const [assessmentId, setAssessmentId] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    // Question state
    const [currentScenario, setCurrentScenario] = useState<string>('');
    const [currentQuestion, setCurrentQuestion] = useState<string>('');
    const [hint, setHint] = useState<string>('');
    const [difficulty, setDifficulty] = useState<Difficulty>('Normal');
    const [showHint, setShowHint] = useState<boolean>(false);

    const [questionNumber, setQuestionNumber] = useState<number>(1);
    const [totalQuestions, setTotalQuestions] = useState<number>(7);
    const [answer, setAnswer] = useState<string>('');

    const [feedback, setFeedback] = useState<string>('');
    const [runningScore, setRunningScore] = useState<number>(0);
    const [finalScore, setFinalScore] = useState<number>(0);
    const [personalizedFeedback, setPersonalizedFeedback] = useState<PersonalizedFeedback | null>(null);
    const [completed, setCompleted] = useState<boolean>(false);
    const [baselineScore, setBaselineScore] = useState<number>(0);
    const startedRef = React.useRef(false);

    useEffect(() => {
        // Prevent double start in React Strict Mode
        if (startedRef.current) return;
        startedRef.current = true;
        startPostAssessment();
    }, []);

    const handleQuestionData = (data: any) => {
        setCurrentScenario(data.scenario || '');
        setCurrentQuestion(data.question || '');
        setHint(data.hint || '');
        setDifficulty(data.difficulty || 'Normal');
        setQuestionNumber(data.questionNumber || 1);
        setTotalQuestions(data.totalQuestions || 7);
        setShowHint(false);
        setAnswer('');
        if (data.runningScore !== undefined) setRunningScore(data.runningScore);
    };

    const startPostAssessment = async () => {
        try {
            setLoading(true);
            setError('');
            console.log('Starting post-assessment for scenario:', scenario.id);

            const res = await fetchWithRetry(`${API_BASE_URL}/api/assessments/post-assessment/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenarioId: scenario.id,
                    userId: user?.id
                })
            });

            const data = await res.json();
            console.log('Start post-assessment response:', data);

            if (!res.ok) {
                throw new Error(data.message || 'Failed to start post-assessment');
            }

            setAssessmentId(data.assessmentId);
            setBaselineScore(data.baselineScore || 0);

            if (data.completed) {
                setFinalScore(data.score);
                setCompleted(true);
            } else {
                handleQuestionData(data);
            }
        } catch (err: any) {
            console.error('Error starting post-assessment:', err);
            setError(err.message || 'Failed to start post-assessment');
        } finally {
            setLoading(false);
        }
    };

    const submitAnswer = async () => {
        if (!answer.trim()) return;

        try {
            setLoading(true);
            setError('');
            console.log('Submitting answer:', answer);

            const res = await fetchWithRetry(`${API_BASE_URL}/api/assessments/post-assessment/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assessmentId,
                    answer: answer.trim()
                })
            });

            const data = await res.json();
            console.log('Answer response:', data);

            if (!res.ok) {
                throw new Error(data.message || 'Failed to submit answer');
            }

            if (data.previousFeedback) {
                setFeedback(data.previousFeedback);
            }

            if (data.completed) {
                setFinalScore(data.score);
                setPersonalizedFeedback(data.personalizedFeedback || null);
                setCompleted(true);
            } else {
                handleQuestionData(data);
            }
        } catch (err: any) {
            console.error('Error submitting answer:', err);
            setError(err.message || 'Failed to submit answer');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = () => {
        onComplete(finalScore);
    };

    const getDifficultyColor = (d: Difficulty) => {
        switch (d) {
            case 'Easy': return 'text-green-400 bg-green-500/10 border-green-500/30';
            case 'Normal': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
            case 'Hard': return 'text-red-400 bg-red-500/10 border-red-500/30';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#111] border border-white/10 rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col relative animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-start sticky top-0 bg-[#111] z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-900/30 rounded-lg">
                            <Trophy className="text-cyan-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Post-Assessment</h2>
                            <p className="text-xs text-gray-400">{scenario.title || scenario.skill || 'Training Module'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && !completed && questionNumber === 1 && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader className="animate-spin text-cyan-400 mb-4" size={48} />
                            <p className="text-gray-400">Loading post-assessment...</p>
                        </div>
                    )}

                    {/* Questions */}
                    {!completed && !loading && (
                        <div className="space-y-6">
                            {/* Progress and Difficulty */}
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-gray-400">Question {questionNumber} of {totalQuestions}</p>
                                    {runningScore > 0 && (
                                        <span className={`text-xs font-bold ${getScoreColor(runningScore)}`}>
                                            ({runningScore}%)
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-2 py-1 rounded border ${getDifficultyColor(difficulty)}`}>
                                        {difficulty}
                                    </span>
                                    <div className="flex gap-0.5">
                                        {Array.from({ length: totalQuestions }, (_, i) => (
                                            <div
                                                key={i}
                                                className={`w-1.5 h-1.5 rounded-full ${i < questionNumber ? 'bg-cyan-400' : 'bg-gray-700'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Previous Feedback */}
                            {feedback && (
                                <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded text-purple-300 text-sm">
                                    <strong>Previous feedback:</strong> {feedback}
                                </div>
                            )}

                            {/* Scenario */}
                            {currentScenario && (
                                <div className="p-4 bg-cyan-900/20 border border-cyan-500/30 rounded-lg">
                                    <p className="text-gray-200 italic">{currentScenario}</p>
                                </div>
                            )}

                            {/* Question */}
                            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                                <p className="text-white font-medium">{currentQuestion}</p>
                            </div>

                            {/* Text Input - Always shown (text-only mode) */}
                            <textarea
                                value={answer}
                                onChange={e => setAnswer(e.target.value)}
                                placeholder="Type your answer here..."
                                className="w-full p-4 bg-black/50 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                                rows={4}
                            />

                            {/* Hint */}
                            {hint && (
                                <div>
                                    {!showHint ? (
                                        <button
                                            onClick={() => setShowHint(true)}
                                            className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 text-sm"
                                        >
                                            <Lightbulb size={16} />
                                            Show Hint
                                        </button>
                                    ) : (
                                        <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded text-yellow-200 text-sm">
                                            <Lightbulb className="inline mr-2" size={14} />
                                            {hint}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                onClick={submitAnswer}
                                disabled={loading || !answer.trim()}
                                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:opacity-50 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <Loader className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        <Send size={20} />
                                        Submit Answer
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Loading during answer processing */}
                    {loading && questionNumber > 1 && !completed && (
                        <div className="flex items-center justify-center py-4">
                            <Loader className="animate-spin text-cyan-400" size={24} />
                        </div>
                    )}

                    {/* Completion */}
                    {completed && (
                        <div className="text-center py-6 space-y-6">
                            <Trophy className="mx-auto text-cyan-400" size={64} />

                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">
                                    Post-Assessment Complete!
                                </h3>
                                <p className="text-gray-300 mb-4">
                                    Your final score:
                                </p>
                                <div className={`text-6xl font-bold ${getScoreColor(finalScore)} mt-2`}>
                                    {finalScore}%
                                </div>

                                {/* Before/After comparison */}
                                {baselineScore !== undefined && (
                                    <div className="mt-4 flex items-center justify-center gap-4 text-sm">
                                        <div className="text-gray-400">
                                            <span className="block text-xs">Baseline</span>
                                            <span className="font-bold text-lg">{baselineScore}%</span>
                                        </div>
                                        <TrendingUp className={finalScore > baselineScore ? 'text-green-400' : 'text-red-400'} size={24} />
                                        <div className="text-gray-400">
                                            <span className="block text-xs">Final</span>
                                            <span className={`font-bold text-lg ${getScoreColor(finalScore)}`}>{finalScore}%</span>
                                        </div>
                                        <div className={`text-sm font-bold ${finalScore > baselineScore ? 'text-green-400' : 'text-red-400'}`}>
                                            {finalScore > baselineScore ? `+${finalScore - baselineScore}%` : `${finalScore - baselineScore}%`}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Personalized Feedback */}
                            {personalizedFeedback && (
                                <div className="text-left space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
                                    <p className="text-gray-300 text-sm">{personalizedFeedback.summary}</p>

                                    {personalizedFeedback.strengths?.length > 0 && (
                                        <div>
                                            <p className="text-green-400 font-semibold text-sm flex items-center gap-1">
                                                <Star size={14} /> Strengths:
                                            </p>
                                            <ul className="text-gray-400 text-xs ml-4 list-disc">
                                                {personalizedFeedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    {personalizedFeedback.recommendations?.length > 0 && (
                                        <div>
                                            <p className="text-cyan-400 font-semibold text-sm flex items-center gap-1">
                                                <ArrowRight size={14} /> Recommendations:
                                            </p>
                                            <ul className="text-gray-400 text-xs ml-4 list-disc">
                                                {personalizedFeedback.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    onClick={handleComplete}
                                    className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all flex items-center gap-2 mx-auto"
                                >
                                    Done
                                    <CheckCircle size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
