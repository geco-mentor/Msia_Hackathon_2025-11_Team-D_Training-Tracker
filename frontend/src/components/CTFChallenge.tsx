import React, { useState } from 'react';
import { Terminal, Send, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Challenge {
    id: string;
    skill: string;
    difficulty: string;
    scenario_text: string;
    task: string;
    type: 'text' | 'multiple_choice';
    options?: string[];
    hint?: string;
}

interface Feedback {
    score: number;
    feedback: string;
}

export const CTFChallenge: React.FC = () => {
    const { user } = useAuth();
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [response, setResponse] = useState('');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showHint, setShowHint] = useState(false);

    const generateChallenge = async () => {
        setLoading(true);
        setError('');
        setChallenge(null);
        setFeedback(null);
        setResponse('');
        setShowHint(false);

        try {
            const res = await fetch('http://localhost:3001/api/challenges/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobTitle: user?.job_title || 'Employee',
                    difficulty: 'Normal' // Could be adaptive later
                })
            });
            const data = await res.json();
            if (data.success) {
                setChallenge(data.data);
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Failed to generate challenge');
        } finally {
            setLoading(false);
        }
    };

    const submitResponse = async () => {
        if (!challenge || !response) return;
        setLoading(true);
        setError('');

        try {
            const res = await fetch('http://localhost:3001/api/challenges/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenarioId: challenge.id,
                    userResponse: response,
                    userId: user?.id
                })
            });
            const data = await res.json();
            if (data.success) {
                setFeedback(data.data);
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Failed to submit response');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#111] border border-white/5 rounded-lg p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white tracking-wider flex items-center gap-2">
                    <Terminal size={18} className="text-cyan-400" />
                    CTF CHALLENGE
                </h2>
                {!challenge && (
                    <button
                        onClick={generateChallenge}
                        disabled={loading}
                        className="px-4 py-2 bg-cyan-600/20 border border-cyan-500/50 text-cyan-400 text-xs font-bold tracking-wider hover:bg-cyan-600/30 transition-all uppercase rounded-sm flex items-center gap-2"
                    >
                        {loading ? <Loader size={14} className="animate-spin" /> : 'GENERATE MISSION'}
                    </button>
                )}
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {challenge && !feedback && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-4 bg-black/30 border border-white/10 rounded font-mono text-sm">
                        <div className="flex justify-between text-xs text-gray-500 mb-2 uppercase tracking-wider">
                            <span>Mission: {challenge.skill}</span>
                            <span className="text-yellow-500">Difficulty: {challenge.difficulty}</span>
                        </div>
                        <p className="text-gray-300 mb-4 leading-relaxed">{challenge.scenario_text}</p>
                        <div className="p-3 bg-cyan-900/10 border-l-2 border-cyan-500 text-cyan-100">
                            <span className="font-bold mr-2">OBJECTIVE:</span>
                            {challenge.task}
                        </div>
                    </div>

                    {challenge.type === 'multiple_choice' && challenge.options ? (
                        <div className="space-y-2">
                            {challenge.options.map((option, idx) => (
                                <label key={idx} className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-all ${response === option ? 'bg-cyan-900/20 border-cyan-500/50 text-cyan-100' : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'}`}>
                                    <input
                                        type="radio"
                                        name="option"
                                        value={option}
                                        checked={response === option}
                                        onChange={(e) => setResponse(e.target.value)}
                                        className="hidden"
                                    />
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${response === option ? 'border-cyan-400' : 'border-gray-500'}`}>
                                        {response === option && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                                    </div>
                                    <span className="text-sm font-mono">{option}</span>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <textarea
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            placeholder="Type your response here..."
                            className="w-full h-32 bg-black/50 border border-white/10 rounded p-3 text-sm font-mono text-gray-300 focus:border-cyan-500/50 focus:outline-none resize-none"
                        />
                    )}

                    <div className="flex justify-between items-center">
                        <button
                            onClick={() => setShowHint(!showHint)}
                            className="text-xs text-gray-500 hover:text-gray-300 underline decoration-dotted"
                        >
                            {showHint ? challenge.hint : 'Need a hint?'}
                        </button>
                        <button
                            onClick={submitResponse}
                            disabled={!response || loading}
                            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-sm tracking-wider rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? <Loader size={16} className="animate-spin" /> : <><Send size={16} /> SUBMIT</>}
                        </button>
                    </div>
                </div>
            )}

            {feedback && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className={`p-6 rounded-lg border flex flex-col items-center text-center ${feedback.score >= 70 ? 'bg-green-900/10 border-green-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                        {feedback.score >= 70 ? (
                            <CheckCircle size={48} className="text-green-400 mb-4" />
                        ) : (
                            <XCircle size={48} className="text-red-400 mb-4" />
                        )}
                        <h3 className={`text-2xl font-bold mb-2 ${feedback.score >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                            SCORE: {feedback.score}%
                        </h3>
                        <p className="text-gray-300 text-sm leading-relaxed max-w-md">
                            {feedback.feedback}
                        </p>
                    </div>
                    <button
                        onClick={generateChallenge}
                        className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold tracking-wider rounded transition-all uppercase"
                    >
                        Next Challenge
                    </button>
                </div>
            )}
        </div>
    );
};
