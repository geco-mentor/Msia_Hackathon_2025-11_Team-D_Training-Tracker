import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Terminal, Cpu, Trophy, Activity, Flame, FileText, User, LogOut } from 'lucide-react';
import { CTFChallenge } from '../components/CTFChallenge';
import { GoalSetter } from '../components/GoalSetter';

export const EmployeeDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const [stats, setStats] = React.useState({
        ranking: user?.ranking || 0,
        win_rate: user?.win_rate || 0,
        streak: user?.streak || 0,
        total_assessments: 0
    });

    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await import('../api/employee').then(m => m.employeeAPI.getDashboardStats());
                if (response.success) {
                    setStats(response.stats);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
            }
        };
        fetchStats();
    }, []);

    const statItems = [
        { label: 'Current Ranking', value: stats.ranking ? `#${stats.ranking}` : '#-', icon: <Trophy size={24} />, color: 'text-amber-400', border: 'hover:border-amber-500/50' },
        { label: 'Win Rate', value: `${stats.win_rate}%`, icon: <Activity size={24} />, color: 'text-emerald-400', border: 'hover:border-emerald-500/50' },
        { label: 'Current Streak', value: `${stats.streak} Days`, icon: <Flame size={24} />, color: 'text-orange-400', border: 'hover:border-orange-500/50' },
        { label: 'Total Assessments', value: stats.total_assessments.toString(), icon: <FileText size={24} />, color: 'text-blue-400', border: 'hover:border-blue-500/50' },
    ];

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
                        onClick={() => navigate('/profile')}
                        className="ml-4 flex items-center gap-2 px-3 py-1 border border-white/20 rounded hover:bg-white/10 transition-colors text-xs font-mono"
                    >
                        <User size={12} />
                        PROFILE
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
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-widest text-white">
                            WELCOME BACK, <span className="text-cyan-400">{user?.name?.split(' ')[0].toUpperCase()}</span>
                        </h1>
                        <p className="text-gray-400">
                            Ready for your next mission?
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statItems.map((stat, index) => (
                        <div key={index} className={`bg-[#111] border border-white/5 p-6 rounded-lg group transition-all duration-300 ${stat.border}`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-lg bg-white/5 ${stat.color}`}>
                                    {stat.icon}
                                </div>
                                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">STAT_0{index + 1}</span>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
                                <p className="text-2xl font-bold text-white font-mono">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* CTF Challenge Section (2 cols) */}
                    <div className="lg:col-span-2 space-y-6">
                        <CTFChallenge />

                        {/* Recent Activity (Below Challenge) */}
                        <div className="bg-[#111] border border-white/5 rounded-lg p-6">
                            <h2 className="text-lg font-bold text-white tracking-wider flex items-center gap-2 mb-6">
                                <Activity size={18} className="text-cyan-400" />
                                RECENT ACTIVITY
                            </h2>
                            <div className="space-y-6">
                                {[1, 2, 3].map((_, i) => (
                                    <div key={i} className="flex items-center gap-4 pb-6 border-b border-white/5 last:pb-0 last:border-0 group">
                                        <div className="w-10 h-10 rounded bg-cyan-900/20 flex items-center justify-center text-cyan-400 font-bold border border-cyan-500/20 group-hover:border-cyan-500/50 transition-colors">
                                            AI
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-200 group-hover:text-cyan-400 transition-colors">Completed "Advanced Prompt Engineering"</h3>
                                            <p className="text-xs text-gray-500 font-mono mt-1">SCORE: 92% • 2 HOURS AGO</p>
                                        </div>
                                        <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-bold border border-green-500/20 rounded">PASSED</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar (1 col) */}
                    <div className="space-y-6">
                        <GoalSetter />

                        {/* Skills Cloud */}
                        <div className="bg-[#111] border border-white/5 rounded-lg p-6">
                            <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-4">ACQUIRED SKILLS</h3>
                            <div className="flex flex-wrap gap-2">
                                {['Python', 'React', 'Machine Learning', 'Data Analysis', 'Cloud Architecture'].map((skill) => (
                                    <span key={skill} className="px-3 py-1 bg-white/5 hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-400 border border-white/5 hover:border-cyan-500/30 rounded text-xs font-mono transition-all cursor-default">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
