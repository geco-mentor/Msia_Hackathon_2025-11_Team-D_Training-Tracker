import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Medal, ArrowLeft, Search, Crown, Activity, Shield, Target, Award, Briefcase, Terminal, Cpu, Code, Network, Brain, Ghost } from 'lucide-react';
import { employeeAPI, LeaderboardEntry } from '../api/employee';
import { useAuth } from '../contexts/AuthContext';
import { getRankFromElo } from '../config';

const RankBadge = ({ elo }: { elo: number }) => {
    const rank = getRankFromElo(elo);

    const getIcon = () => {
        switch (rank.badgeId) {
            case 'initiate': return <Shield size={16} />;
            case 'scout': return <Target size={16} />;
            case 'recruit': return <Award size={16} />;
            case 'agent': return <Briefcase size={16} />;
            case 'operative': return <Terminal size={16} />;
            case 'specialist': return <Cpu size={16} />;
            case 'hacker': return <Code size={16} />;
            case 'architect': return <Network size={16} />;
            case 'mastermind': return <Brain size={16} />;
            case 'ghost': return <Ghost size={16} />;
            default: return <Shield size={16} />;
        }
    };

    return (
        <div className={`flex items-center gap-2 px-2 py-1 rounded-full border bg-opacity-10 w-fit ${rank.color.replace('text-', 'bg-')} ${rank.color.replace('text-', 'border-')}`}>
            <div className={`${rank.color} ${rank.badgeId === 'ghost' ? 'animate-pulse' : ''}`}>
                {getIcon()}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${rank.color}`}>
                {rank.title}
            </span>
        </div>
    );
};

export const Leaderboard: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const data = await employeeAPI.getGlobalLeaderboard();
                if (data.success) {
                    setLeaderboard(data.leaderboard);
                }
            } catch (error) {
                console.error('Failed to fetch leaderboard', error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const getRankStyle = (rank: number) => {
        if (rank === 1) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
        if (rank === 2) return 'text-gray-300 bg-gray-300/10 border-gray-300/20';
        if (rank === 3) return 'text-amber-600 bg-amber-600/10 border-amber-600/20';
        return 'text-gray-400 bg-white/5 theme-border';
    };

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown size={18} className="text-yellow-400" fill="currentColor" />;
        if (rank === 2) return <Medal size={18} className="text-gray-300" />;
        if (rank === 3) return <Medal size={18} className="text-amber-600" />;
        return <span className="font-mono font-bold w-5 text-center">{rank}</span>;
    };

    const filteredLeaderboard = leaderboard.filter(entry =>
        entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen theme-bg-primary text-cyan-50 font-mono selection:bg-cyan-500/30">
            {/* Top Bar */}
            <div className="border-b theme-border theme-bg-nav backdrop-blur-md px-6 py-3 flex justify-between items-center sticky top-0 z-40">
                <div className="flex items-center gap-2 text-sm font-bold tracking-wider text-gray-400">
                    <Trophy size={16} className="text-yellow-500" />
                    <span>GLOBAL RANKINGS</span>
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 px-3 py-1 border theme-border rounded hover:bg-white/5 transition-colors text-xs text-gray-400"
                >
                    <ArrowLeft size={14} /> BACK
                </button>
            </div>

            <div className="max-w-5xl mx-auto p-6 space-y-8">
                <div className="text-center space-y-2 mb-8">
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500 tracking-widest uppercase">
                        Elite Operatives
                    </h1>
                    <p className="text-gray-400 text-sm">Ranked by ELO Rating System</p>
                </div>

                {/* Search */}
                <div className="relative max-w-md mx-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search operative or department..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full theme-bg-secondary border theme-border rounded-full py-2 pl-10 pr-4 text-sm theme-text-primary focus:border-cyan-500/50 focus:outline-none"
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="theme-bg-secondary border theme-border rounded-xl overflow-hidden shadow-2xl">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-white/5 text-gray-500 uppercase text-xs tracking-wider border-b theme-border">
                                    <th className="px-6 py-4 font-medium w-24 text-center">Rank</th>
                                    <th className="px-6 py-4 font-medium">Operative</th>
                                    <th className="px-6 py-4 font-medium">Rank Title</th>
                                    <th className="px-6 py-4 font-medium">Department</th>
                                    <th className="px-6 py-4 font-medium text-right">Win Rate</th>
                                    <th className="px-6 py-4 font-medium text-right">ELO Rating</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredLeaderboard.map((entry) => (
                                    <tr
                                        key={entry.id}
                                        className={`group transition-colors ${entry.id === user?.id
                                            ? 'bg-cyan-500/5 hover:bg-cyan-500/10'
                                            : 'hover:bg-white/5'
                                            }`}
                                    >
                                        <td className="px-6 py-4 text-center">
                                            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full border ${getRankStyle(entry.rank)}`}>
                                                {getRankIcon(entry.rank)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs font-bold text-gray-300 border theme-border">
                                                    {entry.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className={`font-bold ${entry.id === user?.id ? 'text-cyan-400' : 'theme-text-primary'}`}>
                                                        {entry.name}
                                                        {entry.id === user?.id && <span className="ml-2 text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">YOU</span>}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{entry.job_title}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <RankBadge elo={entry.elo_rating} />
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">
                                            <span className="px-2 py-1 rounded bg-white/5 border border-white/5 text-xs">
                                                {entry.department || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-gray-300">
                                            {entry.win_rate}%
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex items-center gap-2 font-mono font-bold text-lg theme-text-primary">
                                                <Activity size={14} className="text-cyan-500" />
                                                {entry.elo_rating}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredLeaderboard.length === 0 && (
                            <div className="p-12 text-center text-gray-500">
                                No operatives found matching your search.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;