import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Terminal, Shield, Target, Cpu, MessageSquare, Database, Lock, Activity, LogOut, User, Briefcase } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface SkillData {
    subject: string;
    A: number;
    fullMark: number;
}

interface Module {
    name: string;
    progress: number;
    completedCount: number;
    totalCount: number;
    status: string;
    color: string;
}

interface ProfileData {
    id: string;
    name: string;
    username: string;
    job_title: string;
    department: string;
    ranking: number;
    elo_rating: number;
    total_points: number;
    win_rate: number;
    streak: number;
    rankTitle: string;
    stats: {
        totalScore: number;
        completedMissions: number;
        totalAssessments: number;
        averageScore: number;
    };
    skillData: SkillData[];
    modules: Module[];
}

export const Profile: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                setError(null);
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/api/employees/profile`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                console.log('Profile data:', data);

                if (data.success) {
                    setProfile(data.profile);
                } else {
                    setError(data.message || 'Failed to load profile');
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
                setError('Failed to load profile data');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    // Use profile data or fallback to defaults
    const skillData = profile?.skillData || [
        { subject: 'Prompt Engineering', A: 0, fullMark: 100 },
        { subject: 'Summarization', A: 0, fullMark: 100 },
        { subject: 'Data Analysis', A: 0, fullMark: 100 },
        { subject: 'Critical Thinking', A: 0, fullMark: 100 },
        { subject: 'Communication', A: 0, fullMark: 100 },
    ];

    const modules = profile?.modules || [];

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-cyan-50 font-mono flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-cyan-50 font-mono selection:bg-cyan-500/30">
            {/* Top Navigation Bar Mimic */}
            <div className="border-b border-white/10 bg-black/50 backdrop-blur-md px-6 py-3 flex justify-between items-center sticky top-0 z-50">
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
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="ml-4 px-3 py-1 border border-white/20 rounded hover:bg-white/10 transition-colors text-xs font-mono"
                    >
                        RETURN_TO_BASE
                    </button>
                    <button
                        onClick={handleLogout}
                        className="ml-2 flex items-center gap-2 px-3 py-1 border border-red-500/30 text-red-400 rounded hover:bg-red-500/10 transition-colors text-xs font-mono"
                    >
                        <LogOut size={12} />
                        LOGOUT
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-8">
                {/* Header Section */}
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-widest text-white">OPERATIVE STATUS:</h1>
                        <span className="text-2xl font-bold text-green-500 animate-pulse">ACTIVE</span>
                    </div>
                    <p className="text-gray-400 max-w-2xl">
                        Welcome to the GenAI CTF Academy, {profile?.name || user?.name || 'Operative'}. Select a module to begin training.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Profile Info Card */}
                <div className="bg-[#111] border border-white/5 rounded-lg p-6">
                    <div className="flex items-start gap-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-3xl font-bold">
                            {(profile?.name || user?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white">{profile?.name || user?.name}</h2>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                                <div className="flex items-center gap-1">
                                    <Briefcase size={14} />
                                    <span>{profile?.job_title || 'Employee'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <User size={14} />
                                    <span>{profile?.department || 'Unassigned'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 mt-3">
                                <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/30 rounded-full">
                                    ELO: {profile?.elo_rating || 1200}
                                </span>
                                <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/30 rounded-full">
                                    {profile?.rankTitle || 'RECRUIT'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Total Score */}
                    <div className="bg-[#111] border border-white/5 rounded-lg p-6 relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Target size={64} />
                        </div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Score</p>
                        <p className="text-4xl font-bold text-white font-mono">{profile?.stats.totalScore || 0}</p>
                    </div>

                    {/* Missions Complete */}
                    <div className="bg-[#111] border border-white/5 rounded-lg p-6 relative overflow-hidden group hover:border-green-500/30 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Shield size={64} />
                        </div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Missions Complete</p>
                        <p className="text-4xl font-bold text-white font-mono">{profile?.stats.completedMissions || 0}</p>
                    </div>

                    {/* Total Assessments */}
                    <div className="bg-[#111] border border-white/5 rounded-lg p-6 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Activity size={64} />
                        </div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Assessed</p>
                        <p className="text-4xl font-bold text-white font-mono">{profile?.stats.totalAssessments || 0}</p>
                    </div>

                    {/* Rank */}
                    <div className="bg-[#111] border border-white/5 rounded-lg p-6 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Lock size={64} />
                        </div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Rank</p>
                        <p className="text-4xl font-bold text-white font-mono">{profile?.rankTitle || 'RECRUIT'}</p>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Skill Matrix */}
                    <div className="bg-[#111] border border-white/5 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-cyan-400 tracking-wider flex items-center gap-2">
                                <Activity size={18} />
                                SKILL MATRIX
                            </h2>
                        </div>
                        <div className="h-[300px] w-full flex items-center justify-center">
                            {skillData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillData}>
                                        <PolarGrid stroke="#333" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 12 }} />
                                        <Radar
                                            name="Skills"
                                            dataKey="A"
                                            stroke="#06b6d4"
                                            strokeWidth={2}
                                            fill="#06b6d4"
                                            fillOpacity={0.3}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center text-gray-500">
                                    <p>Complete assessments to build your skill profile</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Available Modules */}
                    <div className="bg-[#111] border border-white/5 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-green-400 tracking-wider flex items-center gap-2">
                                <Database size={18} />
                                AVAILABLE MODULES
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {modules.length > 0 ? (
                                modules.map((module, idx) => (
                                    <div key={idx} className="bg-black/40 border border-white/5 p-4 rounded flex items-center justify-between hover:bg-white/5 transition-colors group">
                                        <div className="space-y-2 flex-1 mr-4">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-bold text-gray-200 group-hover:text-white transition-colors">{module.name}</span>
                                                <span className="text-gray-500">{module.progress}%</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full bg-gradient-to-r ${module.color}`}
                                                    style={{ width: `${module.progress}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {module.completedCount} / {module.totalCount} completed
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => navigate('/dashboard')}
                                            className="px-4 py-2 bg-transparent border border-cyan-500/50 text-cyan-400 text-xs font-bold tracking-wider hover:bg-cyan-500/10 hover:text-cyan-300 transition-all uppercase rounded-sm"
                                        >
                                            {module.status}
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No modules available yet.</p>
                                    <p className="text-sm mt-2">Complete some challenges to see your progress here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Performance Stats */}
                <div className="bg-[#111] border border-white/5 rounded-lg p-6">
                    <h2 className="text-lg font-bold text-amber-400 tracking-wider mb-6">PERFORMANCE STATS</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-black/40 border border-white/5 rounded">
                            <p className="text-xs text-gray-500 uppercase">Win Rate</p>
                            <p className="text-2xl font-bold text-emerald-400">{profile?.win_rate || 0}%</p>
                        </div>
                        <div className="p-4 bg-black/40 border border-white/5 rounded">
                            <p className="text-xs text-gray-500 uppercase">Current Streak</p>
                            <p className="text-2xl font-bold text-orange-400">{profile?.streak || 0}</p>
                        </div>
                        <div className="p-4 bg-black/40 border border-white/5 rounded">
                            <p className="text-xs text-gray-500 uppercase">Avg. Score</p>
                            <p className="text-2xl font-bold text-purple-400">{profile?.stats.averageScore || 0}%</p>
                        </div>
                        <div className="p-4 bg-black/40 border border-white/5 rounded">
                            <p className="text-xs text-gray-500 uppercase">Leaderboard</p>
                            <p className="text-2xl font-bold text-cyan-400">#{profile?.ranking || '-'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Action Button */}
            <button className="fixed bottom-8 right-8 w-14 h-14 bg-cyan-500 rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:scale-110 transition-transform z-50">
                <MessageSquare size={24} />
            </button>
        </div>
    );
};
