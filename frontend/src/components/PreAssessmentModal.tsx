import React, { useState, useEffect } from 'react';
import { X, Loader, CheckCircle, HelpCircle, Brain, Send, Lightbulb, ArrowRight, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';

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

export const PreAssessmentModal: React.FC<PreAssessmentModalProps> = ({ scenario, onClose, onComplete }) => {
    const { user } = useAuth();
    const [step, setStep] = useState<Step>('loading');
    const [preAssessmentId, setPreAssessmentId] = useState<string | null>(null);
    const [topicName, setTopicName] = useState<string>('this topic');

    // Question state
    const [currentScenario, setCurrentScenario] = useState<string>('');
    const [currentQuestion, setCurrentQuestion] = useState<string>('');
    const [questionType, setQuestionType] = useState<QuestionType>('text');
    const [options, setOptions] = useState<string[]>([]);
    const [hint, setHint] = useState<string>('');
    const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
    const [showHint, setShowHint] = useState<boolean>(false);

    const [questionNumber, setQuestionNumber] = useState<number>(1);
    const [answer, setAnswer] = useState<string>('');
    const [selectedOption, setSelectedOption] = useState<number | null>(null);

    const [loading, setLoading] = useState<boolean>(false);
    const [feedback, setFeedback] = useState<string>('');
    const [baselineScore, setBaselineScore] = useState<number>(0);
    const [personalizedFeedback, setPersonalizedFeedback] = useState<PersonalizedFeedback | null>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        startPreAssessment();
    }, []);

    const startPreAssessment = async () => {
        try {
            setLoading(true);
            setError('');
            console.log('Starting pre-assessment for scenario:', scenario.id);

            const res = await fetch(`${API_BASE_URL}/api/assessments/pre-assessment/start`, {
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
        setCurrentScenario(data.scenario || '');
        setCurrentQuestion(data.question || '');
        setQuestionType(data.type || 'text');
        setOptions(data.options || []);
        setHint(data.hint || '');
        setDifficulty(data.difficulty || 'Easy');
        setQuestionNumber(data.questionNumber || 1);
        setShowHint(false);
        setAnswer('');
        setSelectedOption(null);
    };

    const submitFamiliarity = async (isFamiliar: boolean) => {
        try {
            setLoading(true);
            setError('');
            console.log('Submitting familiarity:', isFamiliar);

            const res = await fetch(`${API_BASE_URL}/api/assessments/pre-assessment/familiarity`, {
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

        try {
            setLoading(true);
            setError('');
            console.log('Submitting answer:', answerToSubmit);

            const res = await fetch(`${API_BASE_URL}/api/assessments/pre-assessment/answer`, {
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

            if (data.previousFeedback) {
                setFeedback(data.previousFeedback);
            }

            if (data.completed) {
                setBaselineScore(data.baselineScore);
                setFeedback(data.lastFeedback || '');
                setPersonalizedFeedback(data.personalizedFeedback || null);
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

    const getDifficultyColor = (d: Difficulty) => {
        switch (d) {
            case 'Easy': return 'text-green-400 bg-green-500/10 border-green-500/30';
            case 'Normal': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
            case 'Hard': return 'text-red-400 bg-red-500/10 border-red-500/30';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#111] border border-white/10 rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col relative animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-start sticky top-0 bg-[#111] z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-900/30 rounded-lg">
                            <Brain className="text-purple-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Pre-Assessment</h2>
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
                    {step === 'loading' && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader className="animate-spin text-purple-400 mb-4" size={48} />
                            <p className="text-gray-400">Loading pre-assessment...</p>
                        </div>
                    )}

                    {/* Familiarity Question */}
                    {step === 'familiarity' && (
                        <div className="text-center py-6 space-y-8">
                            <HelpCircle className="mx-auto text-cyan-400" size={48} />

                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Quick Check</h3>
                                <p className="text-gray-300">
                                    Are you familiar with <span className="text-cyan-400 font-semibold">{topicName}</span>?
                                </p>
                            </div>

                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={() => submitFamiliarity(false)}
                                    disabled={loading}
                                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                                >
                                    No, I'm new to this
                                </button>
                                <button
                                    onClick={() => submitFamiliarity(true)}
                                    disabled={loading}
                                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                                >
                                    Yes, I have some knowledge
                                </button>
                            </div>

                            {loading && <Loader className="animate-spin mx-auto text-purple-400" size={24} />}

                            <p className="text-xs text-gray-500">This helps us determine your baseline knowledge level.</p>
                        </div>
                    )}

                    {/* Questions */}
                    {step === 'questions' && (
                        <div className="space-y-6">
                            {/* Progress and Difficulty */}
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-gray-400">Question {questionNumber} of up to 4</p>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-2 py-1 rounded border ${getDifficultyColor(difficulty)}`}>
                                        {difficulty}
                                    </span>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4].map(i => (
                                            <div
                                                key={i}
                                                className={`w-2 h-2 rounded-full ${i <= questionNumber ? 'bg-cyan-400' : 'bg-gray-700'}`}
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

                            {/* MCQ Options */}
                            {questionType === 'mcq' && options.length > 0 && (
                                <div className="space-y-2">
                                    {options.map((option, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedOption(idx)}
                                            className={`w-full p-3 text-left rounded-lg border transition-all ${selectedOption === idx
                                                    ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                                                    : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'
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
                                    placeholder="Type your answer here..."
                                    className="w-full p-4 bg-black/50 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                                    rows={4}
                                />
                            )}

                            {/* Hint Button and Display */}
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
                                disabled={loading || (questionType === 'mcq' ? selectedOption === null : !answer.trim())}
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

                    {/* Completion */}
                    {step === 'complete' && (
                        <div className="text-center py-6 space-y-6">
                            <CheckCircle className="mx-auto text-green-400" size={64} />

                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">
                                    Pre-Assessment Complete!
                                </h3>
                                <p className="text-gray-300">
                                    Your baseline knowledge score:
                                </p>
                                <div className="text-5xl font-bold text-cyan-400 mt-2">
                                    {baselineScore}%
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
                                    Got it
                                    <X size={20} />
                                </button>
                            </div>

                            <p className="text-xs text-gray-500">
                                Your baseline is recorded. After your training, come back to take the <span className="text-cyan-400 font-semibold">Post-Assessment</span>.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
