import React, { useState } from 'react';
import { X, Search, Sparkles, Brain, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Skill {
    name: string;
    description: string;
    category: string;
}

interface JobAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const JobAnalysisModal: React.FC<JobAnalysisModalProps> = ({ isOpen, onClose }) => {
    const { token } = useAuth();
    const [jobTitle, setJobTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ job_title: string; skills: Skill[] } | null>(null);
    const [error, setError] = useState('');

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!jobTitle.trim()) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch('/api/jobs/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ jobTitle })
            });

            const data = await response.json();

            if (data.success) {
                setResult(data.data);
            } else {
                setError(data.message || 'Failed to analyze job');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#111] border border-white/10 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Brain className="text-purple-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Job Role Analysis</h2>
                            <p className="text-xs text-white/60">AI-powered skill extraction</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleAnalyze} className="mb-8">
                        <label className="block text-xs font-mono text-white/60 mb-2">TARGET_ROLE</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                <input
                                    type="text"
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                    placeholder="e.g. Senior Data Scientist"
                                    className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50 placeholder:text-white/20 transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !jobTitle.trim()}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                ANALYZE
                            </button>
                        </div>
                        {error && (
                            <div className="mt-2 text-red-400 text-xs flex items-center gap-1">
                                <X size={12} /> {error}
                            </div>
                        )}
                    </form>

                    {result && (
                        <div className="animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white">Recommended Skills</h3>
                                <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded border border-green-500/20">
                                    {result.skills.length} Skills Identified
                                </span>
                            </div>

                            <div className="space-y-3">
                                {result.skills.map((skill, index) => (
                                    <div
                                        key={index}
                                        className="p-4 bg-white/5 border border-white/10 rounded-lg hover:border-purple-500/30 transition-colors group"
                                    >
                                        <div className="flex items-start justify-between mb-1">
                                            <h4 className="font-bold text-white group-hover:text-purple-400 transition-colors">
                                                {skill.name}
                                            </h4>
                                            <span className="text-[10px] uppercase tracking-wider text-white/40 bg-white/5 px-2 py-0.5 rounded">
                                                {skill.category}
                                            </span>
                                        </div>
                                        <p className="text-sm text-white/60 leading-relaxed">
                                            {skill.description}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors flex items-center gap-2">
                                    <CheckCircle size={16} />
                                    Save to Database
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
