import React, { useState, useEffect } from 'react';
import { X, Loader, CheckCircle, Brain, Lightbulb, ArrowRight, Star, Zap, Target, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import { ConversationPanel, ConversationMessage } from './ConversationPanel';
import { fetchWithRetry } from '../api/apiRetry';

interface PreAssessmentModalProps {
    scenario: any;
    onClose: () => void;
    onComplete: (baselineScore: number) => void;
}

interface PersonalizedFeedback {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
}

type Step = 'loading' | 'familiarity' | 'questions' | 'complete';
type QuestionType = 'text' | 'mcq';
type Difficulty = 'Easy' | 'Normal' | 'Hard';

// Gamification config
const DIFFICULTY_CONFIG: Record<Difficulty, { xp: number; label: string; color: string }> = {
    'Easy': { xp: 100, label: '⭐ Rookie', color: 'text-green-400 bg-green-500/20 border-green-500/50' },
    'Normal': { xp: 250, label: '⭐⭐ Pro', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50' },
    'Hard': { xp: 500, label: '⭐⭐⭐ Expert', color: 'text-red-400 bg-red-500/20 border-red-500/50' }
};

export const PreAssessmentModal: React.FC<PreAssessmentModalProps> = ({ scenario, onClose, onComplete }) => {
    const { user } = useAuth();
    const [step, setStep] = useState<Step>('loading');
    const [preAssessmentId, setPreAssessmentId] = useState<string | null>(null);
    const [topicName, setTopicName] = useState<string>('this topic');

    // Question state
    const [missionName, setMissionName] = useState<string>('');
    const [currentScenario, setCurrentScenario] = useState<string>('');
    const [currentQuestion, setCurrentQuestion] = useState<string>('');
    const [questionType, setQuestionType] = useState<QuestionType>('text');
    const [options, setOptions] = useState<string[]>([]);
    const [hint, setHint] = useState<string>('');
    const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
    const [currentXP, setCurrentXP] = useState<number>(0);
    const [showHint, setShowHint] = useState<boolean>(false);

    const [questionNumber, setQuestionNumber] = useState<number>(1);
    const [answer, setAnswer] = useState<string>('');
    const [selectedOption, setSelectedOption] = useState<number | null>(null);

    const [loading, setLoading] = useState<boolean>(false);
    const [feedback, setFeedback] = useState<string>('');
    const [baselineScore, setBaselineScore] = useState<number>(0);
    const [totalXPEarned, setTotalXPEarned] = useState<number>(0);
    const [personalizedFeedback, setPersonalizedFeedback] = useState<PersonalizedFeedback | null>(null);
    const [error, setError] = useState<string>('');
    const [showXPAnimation, setShowXPAnimation] = useState<boolean>(false);
    const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);

    // ELO Animation state
    const [showEloAnimation, setShowEloAnimation] = useState<boolean>(false);
    const [eloChange, setEloChange] = useState<number>(0);
    const [eloMessage, setEloMessage] = useState<string>('');

    useEffect(() => {
        startPreAssessment();
    }, []);

    const startPreAssessment = async () => {
        try {
            setLoading(true);
            setError('');
            console.log('Starting pre-assessment for scenario:', scenario.id);

            const res = await fetchWithRetry(`${API_BASE_URL}/api/assessments/pre-assessment/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenarioId: scenario.id,
                    userId: user?.id
                })
            });

            const data = await res.json();
            console.log('Start pre-assessment response:', data);

            if (!res.ok) {
                throw new Error(data.message || 'Failed to start pre-assessment');
            }

            setPreAssessmentId(data.preAssessmentId);

            if (data.completed) {
                setBaselineScore(data.baselineScore);
                setStep('complete');
            } else if (data.currentStep === 'familiarity') {
                setTopicName(data.topicName || scenario.title || 'this topic');
                setStep('familiarity');
            } else if (data.currentStep === 'questions') {
                handleQuestionData(data);
                setStep('questions');
            }
        } catch (err: any) {
            console.error('Error starting pre-assessment:', err);
            setError(err.message || 'Failed to start pre-assessment');
        } finally {
            setLoading(false);
        }
    };

    const handleQuestionData = (data: any) => {
        setMissionName(data.mission || `MISSION: Challenge ${data.questionNumber || 1}`);
        setCurrentScenario(data.scenario || '');
        setCurrentQuestion(data.question || '');
        setQuestionType(data.type || 'text');
        setOptions(data.options || []);
        setHint(data.hint || '');
        setDifficulty(data.difficulty || 'Easy');
        const diff = (data.difficulty as Difficulty) || 'Easy';
        setCurrentXP(data.xp || DIFFICULTY_CONFIG[diff].xp);
        setQuestionNumber(data.questionNumber || 1);
        setShowHint(false);
        setAnswer('');
        setSelectedOption(null);

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
                    difficulty: data.difficulty || 'Easy',
                    scenario: data.scenario || '',
                    missionName: data.mission || ''
                }
            };
            return [...prev, aiMessage];
        });
    };

    const submitFamiliarity = async (isFamiliar: boolean) => {
        try {
            setLoading(true);
            setError('');
            console.log('Submitting familiarity:', isFamiliar);

            const res = await fetchWithRetry(`${API_BASE_URL}/api/assessments/pre-assessment/familiarity`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    preAssessmentId,
                    isFamiliar
                })
            });

            const data = await res.json();
            console.log('Familiarity response:', data);

            if (!res.ok) {
                throw new Error(data.message || 'Failed to submit answer');
            }

            if (data.completed) {
                setBaselineScore(data.baselineScore);
                setStep('complete');
            } else {
                handleQuestionData(data);
                setStep('questions');
            }
        } catch (err: any) {
            console.error('Error submitting familiarity:', err);
            setError(err.message || 'Failed to submit answer');
        } finally {
            setLoading(false);
        }
    };

    const submitAnswer = async () => {
        const answerToSubmit = questionType === 'mcq' && selectedOption !== null
            ? options[selectedOption]
            : answer;

        if (!answerToSubmit?.trim()) return;

        // Add user answer to conversation immediately
        const userMessage: ConversationMessage = {
            id: `user-${Date.now()}-${questionNumber}`,
            type: 'user-answer',
            content: answerToSubmit,
            timestamp: new Date()
        };
        setConversationMessages(prev => [...prev, userMessage]);

        try {
            setLoading(true);
            setError('');
            console.log('Submitting answer:', answerToSubmit);

            const res = await fetchWithRetry(`${API_BASE_URL}/api/assessments/pre-assessment/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    preAssessmentId,
                    answer: answerToSubmit
                })
            });

            const data = await res.json();
            console.log('Answer response:', data);

            if (!res.ok) {
                throw new Error(data.message || 'Failed to submit answer');
            }

            // Add evaluation to conversation (only if there's actual feedback)
            const feedbackText = data.completed ? data.lastFeedback : data.previousFeedback;
            const scoreValue = data.previousScore ?? (data.completed ? data.baselineScore : null);

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

            // Animate XP gain and ELO gain (pre-assessment: no penalty for wrong answers)
            if (data.previousScore && data.previousScore >= 60) {
                setTotalXPEarned(prev => prev + currentXP);
                setShowXPAnimation(true);
                setTimeout(() => setShowXPAnimation(false), 1500);

                // Calculate ELO gain based on score (no deduction in pre-assessment)
                let eloGain = 0;
                let message = '';
                if (data.previousScore >= 90) {
                    eloGain = 15;
                    message = '🎯 Brilliant Move!';
                } else if (data.previousScore >= 70) {
                    eloGain = 10;
                    message = '⚡ Great Answer!';
                } else {
                    eloGain = 5;
                    message = '✓ Good Work!';
                }

                setEloChange(eloGain);
                setEloMessage(message);
                setShowEloAnimation(true);
                setTimeout(() => setShowEloAnimation(false), 2000);
            }

            if (data.previousFeedback || data.lastFeedback) {
                setFeedback(data.previousFeedback || data.lastFeedback);
            }

            if (data.completed) {
                setBaselineScore(data.baselineScore);
                setFeedback(data.lastFeedback || '');
                setPersonalizedFeedback(data.personalizedFeedback || null);
                // Final XP calculation based on score
                const finalXP = Math.round((data.baselineScore / 100) * 4 * 175); // Average XP * questions
                setTotalXPEarned(finalXP);
                setStep('complete');
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
        onComplete(baselineScore);
    };

    const getDifficultyDisplay = (d: Difficulty) => DIFFICULTY_CONFIG[d];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="theme-bg-primary border border-cyan-500/30 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200 shadow-[0_0_30px_rgba(6,182,212,0.15)]">

                {/* Header - Gamified */}
                <div className="p-4 border-b border-cyan-500/20 flex justify-between items-start theme-bg-primary z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-lg animate-pulse">
                            <Target className="theme-text-primary" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                                🎮 MISSION BRIEFING
                            </h2>
                            <p className="text-xs text-gray-400">{scenario.title || scenario.skill || 'Training Module'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
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
                            +{currentXP} XP! 🎯
                        </div>
                    </div>
                )}

                {/* ELO Animation Overlay - Only gains in pre-assessment */}
                {showEloAnimation && eloChange > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                        <div className="flex flex-col items-center animate-bounce">
                            <div className="text-5xl font-bold text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                                +{eloChange} ELO
                            </div>
                            <div className="text-2xl font-bold text-green-300 mt-2">
                                {eloMessage}
                            </div>
                        </div>
                    </div>
                )}

                {/* Two Column Layout */}
                <div className="flex-1 flex overflow-hidden min-h-0">

                    {/* Left Panel - Main Content */}
                    <div className="flex-1 p-6 overflow-y-auto border-r border-cyan-500/10">
                        {error && (
                            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Loading State */}
                        {step === 'loading' && (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader className="animate-spin text-cyan-400 mb-4" size={48} />
                                <p className="text-gray-400">Initializing mission...</p>
                            </div>
                        )}

                        {/* Familiarity Question - Gamified */}
                        {step === 'familiarity' && (
                            <div className="text-center py-6 space-y-8">
                                <div className="relative">
                                    <Brain className="mx-auto text-cyan-400 animate-pulse" size={64} />
                                    <div className="absolute -top-2 -right-2 text-2xl">🎮</div>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold theme-text-primary mb-2">⚡ INTEL CHECK</h3>
                                    <p className="theme-text-secondary">
                                        Agent, do you have prior knowledge of <span className="text-cyan-400 font-bold">{topicName}</span>?
                                    </p>
                                </div>

                                <div className="flex gap-4 justify-center">
                                    <button
                                        onClick={() => submitFamiliarity(false)}
                                        disabled={loading}
                                        className="px-6 py-3 theme-bg-secondary hover:bg-white/10 border theme-border theme-text-primary font-bold rounded-lg transition-all disabled:opacity-50 group"
                                    >
                                        <span className="group-hover:scale-105 inline-block transition-transform">
                                            🆕 New to Me
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => submitFamiliarity(true)}
                                        disabled={loading}
                                        className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 theme-text-primary font-bold rounded-lg transition-all disabled:opacity-50 group shadow-lg shadow-cyan-500/20"
                                    >
                                        <span className="group-hover:scale-105 inline-block transition-transform">
                                            💪 Ready for Action
                                        </span>
                                    </button>
                                </div>

                                {loading && <Loader className="animate-spin mx-auto text-purple-400" size={24} />}

                                <p className="text-xs theme-text-secondary">This calibrates your starting difficulty level</p>
                            </div>
                        )}

                        {/* Questions - Gamified */}
                        {step === 'questions' && (
                            <div className="space-y-5">
                                {/* Mission Header */}
                                <div className="text-center mb-4">
                                    <h3 className="text-sm font-bold text-cyan-400 tracking-wider">{missionName}</h3>
                                </div>

                                {/* Progress and Difficulty */}
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-400">Challenge {questionNumber}/4</span>
                                        {/* Progress bar */}
                                        <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                                style={{ width: `${(questionNumber / 4) * 100}%` }}
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

                                {/* Note: Previous feedback now shown in chat panel sidebar */}

                                {/* Scenario - Mission Style */}
                                {currentScenario && (
                                    <div className="p-4 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 border border-cyan-500/30 rounded-lg relative overflow-hidden">
                                        <div className="absolute top-2 right-2 text-xs text-cyan-400/50 font-mono">SITUATION</div>
                                        <p className="theme-text-primary">{currentScenario}</p>
                                    </div>
                                )}

                                {/* Question */}
                                <div className="p-4 theme-bg-tertiary border theme-border rounded-lg">
                                    <p className="theme-text-primary font-medium text-lg">❓ {currentQuestion}</p>
                                </div>

                                {/* MCQ Options */}
                                {questionType === 'mcq' && options.length > 0 && (
                                    <div className="space-y-2">
                                        {options.map((option, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedOption(idx)}
                                                className={`w-full p-3 text-left rounded-lg border transition-all ${selectedOption === idx
                                                    ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-500/10'
                                                    : 'bg-white/5 border-white/10 theme-text-secondary hover:border-white/30'
                                                    }`}
                                            >
                                                <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Text Input */}
                                {questionType === 'text' && (
                                    <textarea
                                        value={answer}
                                        onChange={e => setAnswer(e.target.value)}
                                        placeholder="Deploy your response here, Agent..."
                                        className="w-full p-4 theme-bg-tertiary border theme-border rounded-lg theme-text-primary placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] resize-none transition-all"
                                        rows={3}
                                    />
                                )}

                                {/* Hint Button and Display */}
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
                                    disabled={loading || (questionType === 'mcq' ? selectedOption === null : !answer.trim())}
                                    className="w-full py-4 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:opacity-50 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]"
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

                        {/* Completion - Gamified */}
                        {step === 'complete' && (
                            <div className="text-center py-6 space-y-6">
                                <div className="relative inline-block">
                                    <Trophy className="mx-auto text-yellow-400 animate-bounce" size={80} />
                                    <div className="absolute -top-2 -right-2 text-3xl">🎯</div>
                                </div>

                                <div>
                                    <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
                                        🎮 MISSION COMPLETE!
                                    </h3>
                                    <p className="theme-text-secondary">
                                        Baseline knowledge calibrated, Agent.
                                    </p>

                                    {/* Score Display */}
                                    <div className="mt-4 p-4 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 rounded-lg border border-cyan-500/30">
                                        <div className="text-5xl font-bold text-cyan-400 mb-2">
                                            {baselineScore}%
                                        </div>
                                        <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold text-lg">
                                            <Zap size={20} />
                                            +{totalXPEarned} XP EARNED
                                        </div>
                                    </div>
                                </div>

                                {feedback && (
                                    <p className="text-gray-400 text-sm max-w-md mx-auto">
                                        {feedback}
                                    </p>
                                )}

                                {/* Personalized Feedback */}
                                {personalizedFeedback && (
                                    <div className="text-left space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
                                        <p className="theme-text-secondary text-sm">{personalizedFeedback.summary}</p>

                                        {personalizedFeedback.strengths?.length > 0 && (
                                            <div>
                                                <p className="text-green-400 font-semibold text-sm flex items-center gap-1">
                                                    <Star size={14} /> 💪 Strengths:
                                                </p>
                                                <ul className="text-gray-400 text-xs ml-4 list-disc">
                                                    {personalizedFeedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                        )}

                                        {personalizedFeedback.recommendations?.length > 0 && (
                                            <div>
                                                <p className="text-cyan-400 font-semibold text-sm flex items-center gap-1">
                                                    <ArrowRight size={14} /> 🎯 Next Objectives:
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
                                        className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold rounded-lg transition-all flex items-center gap-2 mx-auto shadow-lg shadow-cyan-500/20 hover:scale-105"
                                    >
                                        <CheckCircle size={20} />
                                        Continue to Training
                                    </button>
                                </div>

                                <p className="text-xs text-gray-500">
                                    Complete your training, then return for the <span className="text-cyan-400 font-semibold">Post-Assessment Challenge</span>.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right Panel - Conversation History */}
                    <div className="w-80 flex-shrink-0 theme-bg-tertiary border-l border-cyan-500/20 h-full flex flex-col">
                        <ConversationPanel
                            messages={conversationMessages}
                            isLoading={loading}
                            accentColor="cyan"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
