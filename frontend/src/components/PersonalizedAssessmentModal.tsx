import React, { useState } from 'react';
import { X, Loader, Brain, Target, Zap, Award, ChevronRight, MessageSquare, List } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface PersonalizedAssessmentModalProps {
    userId: string;
    userJobTitle: string;
    onClose: () => void;
    onComplete: (score: number, skillsGained: string[]) => void;
}

type Step = 'SETUP' | 'LOADING' | 'ASSESSMENT' | 'RESULTS';

interface Question {
    question: string;
    type: 'multiple_choice' | 'text';
    options?: string[];
    skill: string;
    hint: string;
}

export const PersonalizedAssessmentModal: React.FC<PersonalizedAssessmentModalProps> = ({
    userId,
    userJobTitle,
    onClose,
    onComplete
}) => {
    // State
    const [step, setStep] = useState<Step>('SETUP');
    const [format, setFormat] = useState<'mcq' | 'text'>('mcq');
    const [goal, setGoal] = useState('');
    const [difficulty, setDifficulty] = useState<'Easy' | 'Normal' | 'Hard'>('Normal');

    // Assessment Data
    const [scenarioId, setScenarioId] = useState<string | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    const [currentAnswer, setCurrentAnswer] = useState('');
    const [score, setScore] = useState(0);
    const [error, setError] = useState('');
    const [showHint, setShowHint] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New state for showing feedback before moving on
    const [answerFeedback, setAnswerFeedback] = useState<{
        correct: boolean;
        feedback: string;
        scoreObtained: number;
        nextQuestion?: Question;
        completed: boolean;
        finalScore?: number;
    } | null>(null);

    // Setup Handlers
    const handleGenerate = async () => {
        if (!goal.trim()) return;

        setStep('LOADING');
        setError('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/assessments/personalized/generate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId,
                    jobTitle: userJobTitle,
                    goalDescription: goal,
                    format,
                    difficulty
                })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            setScenarioId(data.data.scenarioId);
            setQuestions([data.data.firstQuestion, ...new Array(data.data.totalQuestions - 1).fill(null)]); // Placeholder for length

            setStep('ASSESSMENT');

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to generate assessment');
            setStep('SETUP');
        } finally {
            // Loading state removed
        }
    };

    const handleSubmitAnswer = async (forcedAnswer?: string, skipped: boolean = false) => {
        if (!scenarioId) return;

        const answerToSend = forcedAnswer || currentAnswer;
        if (!skipped && !answerToSend.trim()) return;

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/assessments/personalized/answer`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId,
                    scenarioId,
                    answer: answerToSend,
                    skipped
                })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            const result = data.data; // { correct, feedback, scoreObtained, completed, finalScore, nextQuestion }

            // Set feedback state to show result UI
            setAnswerFeedback(result);

            // If completed, we will likely show the feedback for the last question first, 
            // then the user clicks "Finish" or "Next" to go to results.

        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNextQuestion = () => {
        if (!answerFeedback) return;

        if (answerFeedback.completed) {
            setScore(answerFeedback.finalScore || 0);
            setStep('RESULTS');
        } else if (answerFeedback.nextQuestion) {
            setQuestions(prev => {
                const newQ = [...prev];
                newQ[currentQuestionIndex + 1] = answerFeedback.nextQuestion!;
                return newQ;
            });
            setCurrentQuestionIndex(prev => prev + 1);
            setCurrentAnswer('');
            setShowHint(false);
            setAnswerFeedback(null);
        }
    };

    // Render Steps
    const renderSetup = () => (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-xl font-bold theme-text-primary mb-2">Skill Assessment</h3>
                <p className="theme-text-secondary text-sm">Test your expertise in specific technical areas.</p>
            </div>

            {error && (
                <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 p-2 rounded-lg animate-fadeIn">
                    {error}
                </div>
            )}

            {/* Format Selection */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => setFormat('mcq')}
                    className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-3 ${format === 'mcq'
                        ? 'bg-cyan-500/20 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        : 'theme-bg-secondary theme-border hover:bg-white/5'
                        }`}
                >
                    <List size={32} className={format === 'mcq' ? 'text-cyan-400' : 'text-gray-400'} />
                    <div className="text-center">
                        <div className={`font-bold ${format === 'mcq' ? 'text-cyan-400' : 'theme-text-primary'}`}>Multiple Choice</div>
                        <div className="text-xs theme-text-secondary mt-1">Soft Training</div>
                    </div>
                </button>

                <button
                    onClick={() => setFormat('text')}
                    className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-3 ${format === 'text'
                        ? 'bg-purple-500/20 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                        : 'theme-bg-secondary theme-border hover:bg-white/5'
                        }`}
                >
                    <MessageSquare size={32} className={format === 'text' ? 'text-purple-400' : 'text-gray-400'} />
                    <div className="text-center">
                        <div className={`font-bold ${format === 'text' ? 'text-purple-400' : 'theme-text-primary'}`}>Text Response</div>
                        <div className="text-xs theme-text-secondary mt-1">Hard Training</div>
                    </div>
                </button>
            </div>

            {/* Goal Input */}
            <div>
                <label className="block text-xs uppercase tracking-wider text-cyan-400 font-bold mb-2">
                    I want to test my expertise in...
                </label>
                <input
                    type="text"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="e.g. Generative AI, Python, React Performance, System Design..."
                    className="w-full bg-black/30 border theme-border rounded-lg p-3 theme-text-primary focus:border-cyan-500 focus:outline-none transition-colors"
                />
            </div>

            {/* Difficulty */}
            <div>
                <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Difficulty</label>
                <div className="flex gap-2">
                    {(['Easy', 'Normal', 'Hard'] as const).map((d) => (
                        <button
                            key={d}
                            onClick={() => setDifficulty(d)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${difficulty === d
                                ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white border-transparent'
                                : 'theme-bg-secondary theme-border theme-text-secondary hover:bg-white/5'
                                }`}
                        >
                            {d}
                        </button>
                    ))}
                </div>
            </div>

            <button
                disabled={!goal.trim()}
                onClick={handleGenerate}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
                Start Assessment <ChevronRight size={18} />
            </button>
        </div>
    );

    const renderLoading = () => (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 animate-pulse"></div>
                <Loader size={48} className="text-cyan-400 animate-spin relative z-10" />
            </div>
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 animate-pulse">
                Constructing Simulation...
            </h3>
            <p className="theme-text-secondary mt-2 max-w-xs">
                AI is generating personalized scenarios based on your goal: "{goal}"
            </p>
        </div>
    );

    const renderAssessment = () => {
        const question = questions[currentQuestionIndex];
        if (!question) return <div>Loading question...</div>;

        // FEEDBACK VIEW
        if (answerFeedback) {
            return (
                <div className="space-y-6 text-center py-8 animate-fadeIn">
                    <div className="mb-6">
                        {answerFeedback.correct ? (
                            <div className="inline-block p-4 rounded-full bg-green-500/20 text-green-400 mb-4">
                                <Award size={48} />
                            </div>
                        ) : (
                            <div className="inline-block p-4 rounded-full bg-yellow-500/20 text-yellow-400 mb-4">
                                <Zap size={48} />
                            </div>
                        )}
                        <h3 className={`text-2xl font-bold mb-2 ${answerFeedback.correct ? 'text-green-400' : 'text-yellow-400'}`}>
                            {answerFeedback.correct ? 'Excellent!' : 'Good Effort!'}
                        </h3>
                        <p className="theme-text-secondary max-w-lg mx-auto">
                            {answerFeedback.feedback}
                        </p>
                    </div>

                    <div className="flex justify-center gap-8 mb-8">
                        <div className="text-center">
                            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Score</div>
                            <div className="text-xl font-bold theme-text-primary">{answerFeedback.scoreObtained}%</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Total Progress</div>
                            <div className="text-xl font-bold theme-text-primary">
                                {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleNextQuestion}
                        className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-bold rounded-lg hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2 mx-auto"
                    >
                        {answerFeedback.completed ? 'Finish Assessment' : 'Next Question'} <ChevronRight size={18} />
                    </button>
                </div>
            );
        }

        // QUESTION VIEW
        return (
            <div className="space-y-6">
                {/* Header: Progress & XP */}
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm theme-text-muted">Question {currentQuestionIndex + 1} of {questions.length}</span>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-bold">
                        <Zap size={12} />
                        Possible XP: {score + 100}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${((currentQuestionIndex) / questions.length) * 100}%` }}
                    />
                </div>

                {/* Question Card */}
                <div className="bg-black/20 border theme-border rounded-xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Brain size={100} />
                    </div>

                    <div className="inline-block px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 text-xs font-bold mb-3">
                        {question.skill || 'General Skill'}
                    </div>

                    <h3 className="text-lg font-medium theme-text-primary leading-relaxed relative z-10">
                        {question.question}
                    </h3>

                    {showHint && question.hint && (
                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-sm animate-fadeIn flex items-start gap-2">
                            <span className="mt-0.5">💡</span> {question.hint}
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="space-y-4">
                    {question.type === 'multiple_choice' && question.options ? (
                        <div className="grid grid-cols-1 gap-3">
                            {question.options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentAnswer(opt)}
                                    className={`text-left p-4 rounded-lg border transition-all ${currentAnswer === opt
                                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-100'
                                        : 'theme-bg-secondary theme-border theme-text-secondary hover:bg-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <span className="inline-block w-6 font-mono opacity-50">{['A', 'B', 'C', 'D'][idx]}.</span> {opt}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <textarea
                            value={currentAnswer}
                            onChange={(e) => setCurrentAnswer(e.target.value)}
                            placeholder="Type your answer here..."
                            rows={4}
                            className="w-full bg-black/30 border theme-border rounded-lg p-4 theme-text-primary focus:border-cyan-500 focus:outline-none resize-none"
                        />
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t theme-border">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowHint(!showHint)}
                            className="theme-text-muted hover:text-yellow-400 transition-colors text-sm flex items-center gap-1"
                        >
                            {showHint ? 'Hide Hint' : 'Need a Hint?'}
                        </button>

                        <button
                            onClick={() => handleSubmitAnswer(undefined, true)}
                            disabled={isSubmitting}
                            className="theme-text-muted hover:text-red-400 transition-colors text-sm flex items-center gap-1"
                        >
                            I don't know
                        </button>
                    </div>

                    <button
                        onClick={() => handleSubmitAnswer()}
                        disabled={!currentAnswer || isSubmitting}
                        className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-bold rounded-lg hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                    >
                        {isSubmitting ? <Loader size={18} className="animate-spin" /> : <>Submit Answer <ChevronRight size={18} /></>}
                    </button>
                </div>
            </div>
        );
    };

    const renderResults = () => (
        <div className="text-center py-8 space-y-6">
            <div className="relative inline-block">
                <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20"></div>
                <div className="w-24 h-24 rounded-full border-4 border-green-500 flex items-center justify-center mx-auto bg-black/50 relative z-10">
                    <span className="text-3xl font-bold text-green-400">{score}%</span>
                </div>
            </div>

            <div>
                <h3 className="text-2xl font-bold text-white mb-2">Assessment Complete!</h3>
                <p className="theme-text-secondary">
                    Great job on working towards your goal: <span className="text-cyan-400">{goal}</span>
                </p>
            </div>

            <div className="bg-white/5 rounded-xl p-6 max-w-sm mx-auto border theme-border">
                <h4 className="text-sm font-bold theme-text-muted uppercase tracking-wider mb-4">Rewards Earned</h4>
                <div className="flex justify-around">
                    <div className="flex flex-col items-center gap-2">
                        <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400">
                            <Zap size={24} />
                        </div>
                        <span className="font-bold theme-text-primary">+{Math.round(score * 2.5)} XP</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                            <Target size={24} />
                        </div>
                        <span className="font-bold theme-text-primary">+10 ELO</span>
                    </div>
                </div>
            </div>

            <button
                onClick={() => {
                    onComplete(score, []);
                    onClose();
                }}
                className="px-8 py-3 bg-white/10 hover:bg-white/20 theme-text-primary font-bold rounded-lg transition-colors border theme-border"
            >
                Close & Return to Dashboard
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="theme-bg-tertiary border theme-border rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b theme-border bg-black/20">
                    <div className="flex items-center gap-2">
                        <Award className="text-cyan-400" size={20} />
                        <h2 className="font-bold theme-text-primary">Personalized Assessment</h2>
                    </div>
                    <button onClick={onClose} className="theme-text-muted hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 min-h-[400px]">
                    {step === 'SETUP' && renderSetup()}
                    {step === 'LOADING' && renderLoading()}
                    {step === 'ASSESSMENT' && renderAssessment()}
                    {step === 'RESULTS' && renderResults()}
                </div>
            </div>
        </div>
    );
};
