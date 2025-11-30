import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Terminal, Cpu, Trophy, Activity, Flame, FileText, User, LogOut, Plus, Trash2, Sparkles } from 'lucide-react';
import { ChallengeCard } from '../components/ChallengeCard';
import { ChallengeModal } from '../components/ChallengeModal';

export const EmployeeDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [mainChallenges, setMainChallenges] = useState<any[]>([]);
    const [personalizedChallenges, setPersonalizedChallenges] = useState<any[]>([]);
    const [selectedChallenge, setSelectedChallenge] = useState<any | null>(null);
    const [generating, setGenerating] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [stats, setStats] = useState({
        ranking: user?.ranking || 0,
        win_rate: user?.win_rate || 0,
        streak: user?.streak || 0,
        total_assessments: 0
    });

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const fetchChallenges = async () => {
        try {
            // Fetch Main Challenges
            const mainRes = await fetch('http://localhost:3001/api/challenges/main');
            const mainData = await mainRes.json();
            if (mainData.success) setMainChallenges(mainData.data);

            // Fetch Personalized Challenges
            if (user?.id) {
                const persRes = await fetch(`http://localhost:3001/api/challenges/personalized/${user.id}`);
                const persData = await persRes.json();
                if (persData.success) setPersonalizedChallenges(persData.data);
            }
        } catch (error) {
            console.error('Failed to fetch challenges', error);
        }
    };

    useEffect(() => {
        fetchChallenges();
        // Fetch stats (mock for now or existing endpoint)
    }, [user?.id]);

    const generatePersonalized = async () => {
        if (!keyword) return;
        setGenerating(true);
        try {
            const res = await fetch('http://localhost:3001/api/challenges/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobTitle: keyword,
                    difficulty: 'Normal',
                    userId: user?.id,
                    isPersonalized: true
                })
            });
            const data = await res.json();
            if (data.success) {
                setPersonalizedChallenges([data.data, ...personalizedChallenges]);
                setKeyword('');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setGenerating(false);
        }
    };

    const deletePersonalized = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await fetch(`http://localhost:3001/api/challenges/${id}`, { method: 'DELETE' });
            setPersonalizedChallenges(personalizedChallenges.filter(c => c.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-cyan-50 font-mono selection:bg-cyan-500/30">
            {/* Top Navigation Bar */}
            <div className="border-b border-white/10 bg-black/50 backdrop-blur-md px-6 py-3 flex justify-between items-center sticky top-0 z-40">
                <div className="flex items-center gap-2 text-sm font-bold tracking-wider text-gray-400">
                    <Terminal size={16} />
                    <span>GenAI CTF Academy</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                        <Cpu size={14} />
                        <span>DEVICE_CONNECTED</span>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <button onClick={handleLogout} className="ml-4 flex items-center gap-2 hover:text-white transition-colors">
                        <LogOut size={14} />
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-8">
                {/* Header & Stats */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-widest text-white">
                            WELCOME BACK, <span className="text-cyan-400">{user?.name?.split(' ')[0].toUpperCase()}</span>
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">Ready for your next mission?</p>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* Left Column: Challenges (3 cols) */}
                    <div className="lg:col-span-3 space-y-8">

                        {/* Main Quests */}
                        <div className="bg-[#111] border border-white/5 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-white tracking-wider flex items-center gap-2">
                                    <span className="text-cyan-400">&gt;_</span> CTF CHALLENGE
                                </h2>
                                <button className="px-3 py-1 bg-cyan-900/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold rounded hover:bg-cyan-900/40 transition-colors">
                                    VIEW ALL
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {mainChallenges.map(challenge => (
                                    <ChallengeCard
                                        key={challenge.id}
                                        challenge={challenge}
                                        onClick={() => setSelectedChallenge(challenge)}
                                    />
                                ))}
                                {mainChallenges.length === 0 && (
                                    <div className="col-span-full text-center py-8 text-gray-600 text-sm">
                                        No main quests available.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Personalized Quests */}
                        <div className="bg-[#111] border border-white/5 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-white tracking-wider flex items-center gap-2">
                                    <span className="text-pink-400">◎</span> PERSONALIZED GOALS
                                </h2>
                            </div>

                            {/* Generator Input */}
                            <div className="flex gap-2 mb-6 max-w-md">
                                <input
                                    type="text"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    placeholder="E.g., AWS Cloud, React..."
                                    className="flex-1 bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-pink-500/50 focus:outline-none"
                                    onKeyDown={(e) => e.key === 'Enter' && generatePersonalized()}
                                />
                                <button
                                    onClick={generatePersonalized}
                                    disabled={generating || !keyword}
                                    className="px-3 py-2 bg-pink-600/20 border border-pink-500/50 text-pink-400 rounded hover:bg-pink-600/30 transition-colors disabled:opacity-50"
                                >
                                    {generating ? <Sparkles size={18} className="animate-spin" /> : <Plus size={18} />}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {personalizedChallenges.map(challenge => (
                                    <div key={challenge.id} className="relative group">
                                        <ChallengeCard
                                            challenge={challenge}
                                            onClick={() => setSelectedChallenge(challenge)}
                                        />
                                        <button
                                            onClick={(e) => deletePersonalized(challenge.id, e)}
                                            className="absolute top-2 right-2 p-1.5 bg-black/50 text-gray-500 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {personalizedChallenges.length === 0 && (
                                    <div className="col-span-full text-center py-8 text-gray-600 text-sm">
                                        No personalized quests. Generate one to start!
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sidebar (1 col) */}
                    <div className="space-y-6 sticky top-24 self-start">

                        {/* Recent Activity */}
                        <div className="bg-[#111] border border-white/5 rounded-lg p-6">
                            <h2 className="text-sm font-bold text-gray-400 tracking-wider flex items-center gap-2 mb-6 uppercase">
                                <Activity size={16} className="text-cyan-400" />
                                Recent Activity
                            </h2>
                            <div className="space-y-6">
                                {[1, 2, 3].map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 pb-4 border-b border-white/5 last:pb-0 last:border-0 group">
                                        <div className="w-8 h-8 rounded bg-cyan-900/20 flex items-center justify-center text-cyan-400 font-bold border border-cyan-500/20 text-xs">
                                            AI
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-300 text-xs truncate group-hover:text-cyan-400 transition-colors">Completed "Prompt Eng..."</h3>
                                            <p className="text-[10px] text-gray-500 font-mono mt-1">SCORE: 92% • 2H AGO</p>
                                        </div>
                                        <span className="px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[10px] font-bold border border-green-500/20 rounded">PASS</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Stats Summary */}
                        <div className="bg-[#111] border border-white/5 rounded-lg p-6">
                            <h2 className="text-sm font-bold text-gray-400 tracking-wider mb-4 uppercase">Stats</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-white/5 rounded border border-white/5">
                                    <p className="text-[10px] text-gray-500 uppercase">Rank</p>
                                    <p className="text-xl font-bold text-amber-400">#{stats.ranking || '-'}</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded border border-white/5">
                                    <p className="text-[10px] text-gray-500 uppercase">Win Rate</p>
                                    <p className="text-xl font-bold text-emerald-400">{stats.win_rate}%</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {selectedChallenge && (
                <ChallengeModal
                    challenge={selectedChallenge}
                    onClose={() => setSelectedChallenge(null)}
                    onSolve={() => {
                        // Refresh challenges or update state
                        fetchChallenges();
                    }}
                />
            )}
        </div>
    );
};
