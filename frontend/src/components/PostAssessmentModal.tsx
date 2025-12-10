import React, { useState, useEffect } from 'react';
import { X, Loader, CheckCircle, Lightbulb, Star, ArrowRight, Trophy, TrendingUp, Zap, Target, Flame } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import { fetchWithRetry } from '../api/apiRetry';
import { ConversationPanel, ConversationMessage } from './ConversationPanel';

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

// Gamification config
const DIFFICULTY_CONFIG: Record<Difficulty, { xp: number; label: string; color: string }> = {
    'Easy': { xp: 100, label: '⭐ Rookie', color: 'text-green-400 bg-green-500/20 border-green-500/50' },
    'Normal': { xp: 250, label: '⭐⭐ Pro', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50' },
    'Hard': { xp: 500, label: '⭐⭐⭐ Expert', color: 'text-red-400 bg-red-500/20 border-red-500/50' }
};

export const PostAssessmentModal: React.FC<PostAssessmentModalProps> = ({ scenario, onClose, onComplete }) => {
    const { user } = useAuth();
    const [assessmentId, setAssessmentId] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    // Question state
    const [missionName, setMissionName] = useState<string>('');
    const [currentScenario, setCurrentScenario] = useState<string>('');
    const [currentQuestion, setCurrentQuestion] = useState<string>('');
    const [hint, setHint] = useState<string>('');
    const [difficulty, setDifficulty] = useState<Difficulty>('Normal');
    const [currentXP, setCurrentXP] = useState<number>(250);
    const [showHint, setShowHint] = useState<boolean>(false);

    const [questionNumber, setQuestionNumber] = useState<number>(1);
    const [totalQuestions, setTotalQuestions] = useState<number>(4);
    const [answer, setAnswer] = useState<string>('');

    const [feedback, setFeedback] = useState<string>('');
    const [runningScore, setRunningScore] = useState<number>(0);
    const [totalXPEarned, setTotalXPEarned] = useState<number>(0);
    const [streak, setStreak] = useState<number>(0);
    const [finalScore, setFinalScore] = useState<number>(0);
    const [personalizedFeedback, setPersonalizedFeedback] = useState<PersonalizedFeedback | null>(null);
    const [completed, setCompleted] = useState<boolean>(false);
    const [baselineScore, setBaselineScore] = useState<number>(0);
    const [showXPAnimation, setShowXPAnimation] = useState<boolean>(false);
    const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
    const startedRef = React.useRef(false);

    // ELO Animation state
    const [showEloAnimation, setShowEloAnimation] = useState<boolean>(false);
    const [eloChange, setEloChange] = useState<number>(0);
    const [eloMessage, setEloMessage] = useState<string>('');
    const [totalEloChange, setTotalEloChange] = useState<number>(0);

    useEffect(() => {
        // Prevent double start in React Strict Mode
        if (startedRef.current) return;
        startedRef.current = true;
        startPostAssessment();
    }, []);

    const handleQuestionData = (data: any) => {
        setMissionName(data.mission || `MISSION: Challenge ${data.questionNumber || 1}`);
        setCurrentScenario(data.scenario || '');
        setCurrentQuestion(data.question || '');
        setHint(data.hint || '');
        setDifficulty(data.difficulty || 'Normal');
        const diff = (data.difficulty as Difficulty) || 'Normal';
        setCurrentXP(data.xp || DIFFICULTY_CONFIG[diff].xp);
        setQuestionNumber(data.questionNumber || 1);
        setTotalQuestions(data.totalQuestions || 4);
        setShowHint(false);
        setAnswer('');
        if (data.runningScore !== undefined) setRunningScore(data.runningScore);

        // Add AI question to conversation (prevent duplicates)
        const newQuestionId = `ai-q${data.questionNumber || 1}`;
        setConversationMessages(prev => {
            // Check if this question already exists
            if (prev.some(msg => msg.id === newQuestionId)) {
                return prev; // Don't add duplicate
            }
            const aiMessage: ConversationMessage = {
                id: newQuestionId,
                type: 'ai-question',
                content: data.question || '',
                timestamp: new Date(),
                metadata: {
                    questionNumber: data.questionNumber || 1,
                    difficulty: data.difficulty || 'Normal',
                    scenario: data.scenario || '',
                    missionName: data.mission || ''
                }
            };
            return [...prev, aiMessage];
        });
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

        // Add user answer to conversation immediately
        const userMessage: ConversationMessage = {
            id: `user-${Date.now()}-${questionNumber}`,
            type: 'user-answer',
            content: answer,
            timestamp: new Date()
        };
        setConversationMessages(prev => [...prev, userMessage]);

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

            // Add evaluation to conversation (only if there's actual feedback)
            const feedbackText = data.completed ? data.lastFeedback : data.previousFeedback;
            const scoreValue = data.previousScore ?? (data.completed ? data.score : null);

            if (feedbackText || scoreValue !== null) {
                const xpForThisQuestion = (scoreValue && scoreValue >= 60) ? currentXP : 0;
                const evalMessage: ConversationMessage = {
                    id: `eval-q${questionNumber}`,
                    type: 'evaluation',
                    content: feedbackText || 'Answer evaluated.',
                    timestamp: new Date(),
                    metadata: {
                        questionNumber: questionNumber,
                        score: scoreValue || 0,
                        xpEarned: xpForThisQuestion,
                        feedback: feedbackText || ''
                    }
                };
                setConversationMessages(prev => {
                    // Prevent duplicate evaluation
                    if (prev.some(msg => msg.id === `eval-q${questionNumber}`)) {
                        return prev;
                    }
                    return [...prev, evalMessage];
                });
            }

            // XP and streak logic + ELO calculation (post-assessment: both gains and losses)
            let currentEloChange = 0;
            let message = '';

            if (data.previousScore && data.previousScore >= 60) {
                setTotalXPEarned(prev => prev + currentXP);
                setStreak(prev => prev + 1);
                setShowXPAnimation(true);
                setTimeout(() => setShowXPAnimation(false), 1500);

                // Calculate ELO gain based on score
                if (data.previousScore >= 90) {
                    currentEloChange = 15;
                    message = '🎯 Brilliant Move!';
                } else if (data.previousScore >= 70) {
                    currentEloChange = 10;
                    message = '⚡ Great Answer!';
                } else {
                    currentEloChange = 5;
                    message = '✓ Good Work!';
                }
            } else {
                setStreak(0);

                // Calculate ELO loss based on score (post-assessment only)
                if (data.previousScore !== undefined) {
                    if (data.previousScore >= 40) {
                        currentEloChange = -5;
                        message = '📉 Keep Trying!';
                    } else {
                        currentEloChange = -10;
                        message = '💪 Room to Improve!';
                    }
                }
            }

            // Update ELO tracking and show animation
            if (currentEloChange !== 0) {
                setEloChange(currentEloChange);
                setEloMessage(message);
                setTotalEloChange(prev => prev + currentEloChange);
                setShowEloAnimation(true);
                setTimeout(() => setShowEloAnimation(false), 2000);
            }

            if (data.previousFeedback || data.lastFeedback) {
                setFeedback(data.previousFeedback || data.lastFeedback);
            }

            if (data.completed) {
                setFinalScore(data.score);
                setPersonalizedFeedback(data.personalizedFeedback || null);
                // Final XP calculation
                const finalXP = Math.round((data.score / 100) * totalQuestions * 250);
                setTotalXPEarned(finalXP);
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

    const getDifficultyDisplay = (d: Difficulty) => DIFFICULTY_CONFIG[d];

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getImprovement = () => {
        const diff = finalScore - baselineScore;
        if (diff > 0) return { text: `+${diff}%`, color: 'text-green-400', icon: '📈' };
        if (diff < 0) return { text: `${diff}%`, color: 'text-red-400', icon: '📉' };
        return { text: '0%', color: 'text-gray-400', icon: '➡️' };
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="theme-bg-primary border border-purple-500/30 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200 shadow-[0_0_30px_rgba(168,85,247,0.15)]">

                {/* Header - Gamified */}
                <div className="p-4 border-b border-purple-500/20 flex justify-between items-start theme-bg-primary z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg animate-pulse">
                            <Trophy className="theme-text-primary" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                                🏆 FINAL CHALLENGE
                            </h2>
                            <p className="text-xs text-gray-400">{scenario.title || scenario.skill || 'Training Module'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {streak >= 2 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 border border-orange-500/30 rounded text-orange-400 text-sm font-bold animate-pulse">
                                <Flame size={14} />
                                {streak}x STREAK!
                            </div>
                        )}
                        {totalXPEarned > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-400 text-sm font-bold">
                                <Zap size={14} />
                                {totalXPEarned} XP
                            </div>
                        )}
                        <button onClick={onClose} className="text-gray-500 hover:theme-text-primary transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* XP Animation Overlay */}
                {showXPAnimation && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="text-4xl font-bold text-yellow-400 animate-bounce">
                            +{currentXP} XP! {streak >= 2 ? '🔥' : '🎯'}
                        </div>
                    </div>
                )}

                {/* ELO Animation Overlay - Both gains and losses in post-assessment */}
                {showEloAnimation && eloChange !== 0 && (
                    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                        <div className="flex flex-col items-center animate-bounce">
                            <div className={`text-5xl font-bold ${eloChange > 0 ? 'text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}>
                                {eloChange > 0 ? '+' : ''}{eloChange} ELO
                            </div>
                            <div className={`text-2xl font-bold mt-2 ${eloChange > 0 ? 'text-green-300' : 'text-red-300'}`}>
                                {eloMessage}
                            </div>
                        </div>
                    </div>
                )}

                {/* Two Column Layout */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Left Panel - Main Content */}
                    <div className="flex-1 p-6 overflow-y-auto border-r border-purple-500/10">
                        {error && (
                            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Loading State */}
                        {loading && !completed && questionNumber === 1 && (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader className="animate-spin text-purple-400 mb-4" size={48} />
                                <p className="text-gray-400">Preparing final challenge...</p>
                            </div>
                        )}

                        {/* Questions - Gamified */}
                        {!completed && !loading && (
                            <div className="space-y-5">
                                {/* Mission Header */}
                                <div className="text-center mb-4">
                                    <h3 className="text-sm font-bold text-purple-400 tracking-wider">{missionName}</h3>
                                </div>

                                {/* Progress and Difficulty */}
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-400">Challenge {questionNumber}/{totalQuestions}</span>
                                        {runningScore > 0 && (
                                            <span className={`text-xs font-bold ${getScoreColor(runningScore)}`}>
                                                ({runningScore}%)
                                            </span>
                                        )}
                                        {/* Progress bar */}
                                        <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                                                style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getDifficultyDisplay(difficulty).color}`}>
                                            {getDifficultyDisplay(difficulty).label}
                                        </span>
                                        <span className="text-xs text-yellow-400 font-bold flex items-center gap-1">
                                            <Zap size={12} /> {currentXP} XP
                                        </span>
                                    </div>
                                </div>

                                {/* Previous Feedback */}
                                {feedback && (
                                    <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg text-purple-300 text-sm">
                                        <strong>📊 Intel:</strong> {feedback}
                                    </div>
                                )}

                                {/* Scenario - Mission Style */}
                                {currentScenario && (
                                    <div className="p-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-lg relative overflow-hidden">
                                        <div className="absolute top-2 right-2 text-xs text-purple-400/50 font-mono">SITUATION</div>
                                        <p className="theme-text-primary">{currentScenario}</p>
                                    </div>
                                )}

                                {/* Question */}
                                <div className="p-4 theme-bg-tertiary border theme-border rounded-lg">
                                    <p className="theme-text-primary font-medium text-lg">❓ {currentQuestion}</p>
                                </div>

                                {/* Text Input */}
                                <textarea
                                    value={answer}
                                    onChange={e => setAnswer(e.target.value)}
                                    placeholder="Deploy your response here, Agent..."
                                    className="w-full p-4 theme-bg-tertiary border theme-border rounded-lg theme-text-primary placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:shadow-[0_0_15px_rgba(168,85,247,0.2)] resize-none transition-all"
                                    rows={3}
                                />

                                {/* Hint */}
                                {hint && (
                                    <div>
                                        {!showHint ? (
                                            <button
                                                onClick={() => setShowHint(true)}
                                                className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 text-sm transition-colors"
                                            >
                                                <Lightbulb size={16} />
                                                💡 Request Intel
                                            </button>
                                        ) : (
                                            <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-yellow-200 text-sm">
                                                <Lightbulb className="inline mr-2" size={14} />
                                                {hint}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Submit Button - Gamified */}
                                <button
                                    onClick={submitAnswer}
                                    disabled={loading || !answer.trim()}
                                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 disabled:opacity-50 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {loading ? (
                                        <Loader className="animate-spin" size={20} />
                                    ) : (
                                        <>
                                            <Target size={20} />
                                            ⚔️ LOCK IN ANSWER
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Loading during answer processing */}
                        {loading && questionNumber > 1 && !completed && (
                            <div className="flex items-center justify-center py-4">
                                <Loader className="animate-spin text-purple-400" size={24} />
                            </div>
                        )}

                        {/* Completion - Victory Screen */}
                        {completed && (
                            <div className="text-center py-6 space-y-6">
                                <div className="relative inline-block">
                                    <Trophy className="mx-auto text-yellow-400" size={80} />
                                    <div className="absolute -top-2 -right-2 text-3xl animate-bounce">🏆</div>
                                </div>

                                <div>
                                    <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
                                        🎮 CHALLENGE CONQUERED!
                                    </h3>
                                    <p className="text-gray-300 mb-4">
                                        Outstanding performance, Agent!
                                    </p>

                                    {/* Main Score */}
                                    <div className={`text-6xl font-bold ${getScoreColor(finalScore)} mt-2`}>
                                        {finalScore}%
                                    </div>

                                    {/* XP Earned */}
                                    <div className="mt-4 flex items-center justify-center gap-2 text-yellow-400 font-bold text-xl">
                                        <Zap size={24} />
                                        +{totalXPEarned} XP EARNED
                                    </div>

                                    {/* Total ELO Change */}
                                    {totalEloChange !== 0 && (
                                        <div className={`mt-2 flex items-center justify-center gap-2 font-bold text-lg ${totalEloChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            <TrendingUp size={20} />
                                            {totalEloChange > 0 ? '+' : ''}{totalEloChange} ELO
                                        </div>
                                    )}

                                    {/* Before/After comparison */}
                                    <div className="mt-6 p-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg border border-purple-500/30">
                                        <div className="flex items-center justify-center gap-6 text-sm">
                                            <div className="text-gray-400">
                                                <span className="block text-xs">📋 Baseline</span>
                                                <span className="font-bold text-lg">{baselineScore}%</span>
                                            </div>
                                            <TrendingUp className={finalScore > baselineScore ? 'text-green-400' : 'text-red-400'} size={28} />
                                            <div className="text-gray-400">
                                                <span className="block text-xs">🏆 Final</span>
                                                <span className={`font-bold text-lg ${getScoreColor(finalScore)}`}>{finalScore}%</span>
                                            </div>
                                            <div className={`text-lg font-bold ${getImprovement().color} flex items-center gap-1`}>
                                                {getImprovement().icon} {getImprovement().text}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Personalized Feedback */}
                                {personalizedFeedback && (
                                    <div className="text-left space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
                                        <p className="text-gray-300 text-sm">{personalizedFeedback.summary}</p>

                                        {personalizedFeedback.strengths?.length > 0 && (
                                            <div>
                                                <p className="text-green-400 font-semibold text-sm flex items-center gap-1">
                                                    <Star size={14} /> 💪 Mastered Skills:
                                                </p>
                                                <ul className="text-gray-400 text-xs ml-4 list-disc">
                                                    {personalizedFeedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                        )}

                                        {personalizedFeedback.recommendations?.length > 0 && (
                                            <div>
                                                <p className="text-purple-400 font-semibold text-sm flex items-center gap-1">
                                                    <ArrowRight size={14} /> 🎯 Next Quest:
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
                                        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-lg transition-all flex items-center gap-2 mx-auto shadow-lg shadow-purple-500/20 hover:scale-105"
                                    >
                                        <CheckCircle size={20} />
                                        Claim Victory
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Panel - Conversation History */}
                    <div className="w-80 flex-shrink-0 theme-bg-tertiary border-l border-purple-500/20 h-full">
                        <ConversationPanel
                            messages={conversationMessages}
                            isLoading={loading}
                            accentColor="purple"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
