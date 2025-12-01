import React, { useState } from 'react';
import { X, Send, Loader, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';

interface ChallengeModalProps {
    challenge: any;
    onClose: () => void;
    onSolve: () => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({ challenge, onClose, onSolve }) => {
    const { user } = useAuth();
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<any>(null);
    const [showHint, setShowHint] = useState(false);

    const submitResponse = async () => {
        if (!response) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/challenges/submit`, {
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
                if (data.data.score >= 70) {
                    onSolve();
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#111] border border-white/10 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col relative animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-start sticky top-0 bg-[#111] z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider px-2 py-0.5 bg-cyan-900/20 rounded border border-cyan-500/20">
                                {challenge.category || 'General'}
                            </span>
                            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
                                {challenge.difficulty}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-white">{challenge.title || challenge.skill}</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="bg-white/5 rounded p-4 border border-white/5">
                        <p className="text-gray-300 leading-relaxed font-mono text-sm">
                            {challenge.scenario_text}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Mission Objective</h3>
                        <p className="text-white font-medium">{challenge.task}</p>
                    </div>

                    {feedback ? (
                        <div className={`p-6 rounded-lg border flex flex-col items-center text-center ${feedback.score >= 70 ? 'bg-green-900/10 border-green-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                            {feedback.score >= 70 ? (
                                <CheckCircle size={48} className="text-green-400 mb-4" />
                            ) : (
                                <XCircle size={48} className="text-red-400 mb-4" />
                            )}
                            <h3 className={`text-2xl font-bold mb-2 ${feedback.score >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                                SCORE: {feedback.score}%
                            </h3>
                            <p className="text-gray-300 text-sm leading-relaxed max-w-md mb-6">
                                {feedback.feedback}
                            </p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                            >
                                Close Mission
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {challenge.type === 'multiple_choice' && challenge.options ? (
                                <div className="space-y-2">
                                    {challenge.options.map((option: string, idx: number) => (
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
                                    placeholder="Type your solution here..."
                                    className="w-full h-40 bg-black/50 border border-white/10 rounded p-4 text-sm font-mono text-gray-300 focus:border-cyan-500/50 focus:outline-none resize-none"
                                />
                            )}

                            <div className="flex justify-between items-center pt-4 border-t border-white/10">
                                <button
                                    onClick={() => setShowHint(!showHint)}
                                    className="text-xs text-gray-500 hover:text-cyan-400 flex items-center gap-1 transition-colors"
                                >
                                    <HelpCircle size={14} />
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
                </div>
            </div>
        </div>
    );
};
