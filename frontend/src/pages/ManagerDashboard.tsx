import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, LogOut, Shield, LayoutGrid, Target, Sun, Moon, Crown, TrendingUp, AlertTriangle, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { EmployeeDetailsModal } from '../components/EmployeeDetailsModal';

export const ManagerDashboard: React.FC = () => {
    const { logout, token, user } = useAuth();
    const { toggleTheme, isDark } = useTheme();
    const navigate = useNavigate();
    const [teamMembers, setTeamMembers] = React.useState<any[]>([]);
    const [analytics, setAnalytics] = React.useState<any>(null);
    const [predictions, setPredictions] = React.useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = React.useState<any>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);

    // Derived State
    const [topPerformer, setTopPerformer] = React.useState<any>(null);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    React.useEffect(() => {
        const fetchTeamData = async () => {
            try {
                // 1. Fetch Team Members
                const empResponse = await import('../api/employee').then(m => m.employeeAPI.getAllEmployees());

                if (empResponse.success) {
                    // Filter for my team
                    const myTeam = user?.department
                        ? empResponse.employees.filter((e: any) => e.department === user.department)
                        : empResponse.employees;

                    setTeamMembers(myTeam);

                    // Identify Top Performer
                    if (myTeam.length > 0) {
                        const top = [...myTeam].sort((a, b) => (b.elo_rating || 0) - (a.elo_rating || 0))[0];
                        setTopPerformer(top);
                    }
                }

                if (token && user?.department) {
                    const params = new URLSearchParams();
                    params.append('department', user.department);

                    // 2. Fetch Analytics
                    const analyticsResponse = await fetch(`/api/analytics/overview?${params.toString()}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const analyticsData = await analyticsResponse.json();
                    if (analyticsData.success) {
                        setAnalytics(analyticsData.data);
                    }

                    // 3. Fetch Predictions (New)
                    const predResponse = await fetch(`/api/analytics/predictions?${params.toString()}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const predData = await predResponse.json();
                    if (predData.success) {
                        setPredictions(predData.data);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch manager dashboard data:', error);
            }
        };
        fetchTeamData();
    }, [token, user]);

    const handleViewEmployee = async (id: string) => {
        try {
            const response = await fetch(`/api/employees/${id}/details`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setSelectedEmployee(data.employee);
                setIsDetailsModalOpen(true);
            }
        } catch (error) {
            console.error('Failed to fetch employee details:', error);
        }
    };

    // Helper to get color for skill score - consistent cyan color scheme
    const getScoreColor = (score: number) => {
        if (score >= 90) return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]'; // Excellent - green glow
        if (score >= 75) return 'bg-cyan-500'; // Good - bright cyan
        if (score >= 60) return 'bg-cyan-600'; // Average - medium cyan
        if (score >= 40) return 'bg-slate-500'; // Below average - gray
        return 'bg-slate-600'; // Low - dark gray
    };

    // Skills needed for the matrix
    const matrixSkills = React.useMemo(() => {
        const skills = new Set<string>();
        teamMembers.forEach(m => {
            if (m.skills_profile) Object.keys(m.skills_profile).forEach(k => skills.add(k));
        });
        return Array.from(skills).sort().slice(0, 7); // Show top 7 alphabetical for UI fit
    }, [teamMembers]);

    // Segment predictions
    const atRisk = predictions.filter(p => p.status === 'At Risk');
    const accelerating = predictions.filter(p => p.status === 'Accelerating');

    return (
        <div className="min-h-screen theme-bg-primary theme-text-primary font-mono selection:bg-cyan-500/30">
            {/* Top Bar */}
            <div className="h-16 border-b theme-border theme-bg-nav backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50 shadow-lg shadow-cyan-500/5">
                <div className="flex items-center gap-4">
                    <div className="bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/20">
                        <Shield className="text-cyan-500" size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold tracking-widest text-cyan-500 text-lg">COMMAND CENTER</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">LIVE</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs theme-text-secondary">
                            <span className="font-bold">{user?.department?.toUpperCase() || 'ENGINEERING'} DIVISION</span>
                            <span>|</span>
                            <span>CMD: {user?.name?.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={toggleTheme} className="theme-toggle hover:rotate-12 transition-transform">
                        {isDark ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded hover:bg-red-500/20 transition-all text-xs font-bold tracking-wider">
                        <LogOut size={14} />
                        DISCONNECT
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-8 space-y-8 animate-enter">

                {/* HUD Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 1. Unit Status (Left) */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Strength */}
                        <div className="theme-bg-secondary p-5 rounded-xl border-l-4 border-cyan-500 shadow-lg relative overflow-hidden group">
                            <div className="absolute right-0 top-0 opacity-5 group-hover:scale-110 transition-transform duration-500">
                                <Users size={100} />
                            </div>
                            <p className="text-cyan-500 text-xs font-bold tracking-wider mb-1">ACTIVE UNIT STRENGTH</p>
                            <div className="flex items-end gap-2">
                                <h3 className="text-4xl font-bold theme-text-primary">{teamMembers.length}</h3>
                                <span className="text-xs theme-text-secondary mb-2">Operatives</span>
                            </div>
                        </div>

                        {/* Skill Index */}
                        <div className="theme-bg-secondary p-5 rounded-xl border-l-4 border-purple-500 shadow-lg relative overflow-hidden group">
                            <div className="absolute right-0 top-0 opacity-5 group-hover:scale-110 transition-transform duration-500">
                                <Activity size={100} />
                            </div>
                            <p className="text-purple-500 text-xs font-bold tracking-wider mb-1">AVG SKILL RATING</p>
                            <div className="flex items-end gap-2">
                                <h3 className="text-4xl font-bold theme-text-primary">
                                    {Math.round(teamMembers.reduce((acc, curr) => acc + (curr.elo_rating || 1000), 0) / (teamMembers.length || 1))}
                                </h3>
                                <span className="text-xs text-green-500 flex items-center mb-2"><TrendingUp size={12} className="mr-1" /> +12%</span>
                            </div>
                        </div>

                        {/* Readiness */}
                        <div className="theme-bg-secondary p-5 rounded-xl border-l-4 border-green-500 shadow-lg relative overflow-hidden group">
                            <div className="absolute right-0 top-0 opacity-5 group-hover:scale-110 transition-transform duration-500">
                                <Target size={100} />
                            </div>
                            <p className="text-green-500 text-xs font-bold tracking-wider mb-1">MISSION READINESS</p>
                            <div className="flex items-end gap-2">
                                <h3 className="text-4xl font-bold theme-text-primary">94%</h3>
                                <span className="text-xs theme-text-secondary mb-2">Deployable</span>
                            </div>
                        </div>
                    </div>

                    {/* 2. Top Performing Operative (Right) */}
                    {topPerformer ? (
                        <div className="theme-bg-secondary rounded-xl p-1 relative overflow-hidden shadow-xl shadow-yellow-500/10 border border-yellow-500/20">
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent pointer-events-none" />
                            <div className="bg-gray-900 dark:bg-black/40 h-full w-full rounded-lg p-5 relative z-10 flex flex-col justify-center">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <p className="text-yellow-500 text-xs font-bold tracking-widest flex items-center gap-2">
                                            <Crown size={14} /> TOP OPERATIVE
                                        </p>
                                        <h3 className="text-2xl font-bold text-white mt-1">{topPerformer.name}</h3>
                                        <p className="text-xs text-gray-400">{topPerformer.job_title}</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-600 p-[2px]">
                                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-yellow-500 font-bold text-lg">
                                            {topPerformer.name.charAt(0)}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-white/5 p-2 rounded border border-white/10">
                                        <span className="block text-gray-400">ELO Rating</span>
                                        <span className="block text-lg font-mono text-yellow-400">{topPerformer.elo_rating}</span>
                                    </div>
                                    <div className="bg-white/5 p-2 rounded border border-white/10">
                                        <span className="block text-gray-400">Win Rate</span>
                                        <span className="block text-lg font-mono text-yellow-400">{topPerformer.win_rate != null ? `${(topPerformer.win_rate * 100).toFixed(0)}%` : 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="theme-bg-secondary rounded-xl p-6 flex items-center justify-center text-gray-500 text-sm">
                            No Data Available
                        </div>
                    )}
                </div>

                {/* 3. Predictive Analytics (New) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Risk Radar */}
                    <div className="theme-bg-secondary border border-red-500/30 rounded-xl overflow-hidden shadow-2xl relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <AlertTriangle size={100} className="text-red-500" />
                        </div>
                        <div className="p-5 border-b border-red-500/20 flex items-center justify-between bg-red-50 dark:bg-red-900/10">
                            <h3 className="font-bold flex items-center gap-2 text-red-600 dark:text-red-500">
                                <AlertTriangle size={18} />
                                RISK RADAR
                            </h3>
                            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30">ATTENTION REQUIRED</span>
                        </div>
                        <div className="p-4 space-y-3">
                            {atRisk.length > 0 ? (
                                atRisk.map((p: any) => (
                                    <div key={p.id} className="bg-gray-50 dark:bg-black/40 border border-red-500/20 p-3 rounded flex flex-col gap-2 group hover:border-red-500/50 transition-colors shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div
                                                    className="font-bold text-gray-200 cursor-pointer hover:text-red-400 transition-colors"
                                                    onClick={() => handleViewEmployee(p.id)}
                                                >
                                                    {p.name}
                                                </div>
                                                <div className="text-[10px] text-red-400 mt-1 flex flex-wrap gap-2">
                                                    {p.factors.map((f: string, i: number) => (
                                                        <span key={i} className="bg-red-500/10 px-1 rounded">{f}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-gray-400">Projected ELO</div>
                                                <div className="font-mono text-red-500 font-bold">{p.projectedElo} <span className="text-[10px]">↓</span></div>
                                            </div>
                                        </div>

                                        {/* Actionable Insight: Training Request */}
                                        {p.factors.includes('Uncertified for Goal') && (
                                            <div className="pt-2 border-t border-red-500/10 flex items-center justify-between">
                                                <span className="text-[10px] text-gray-400">Goal: {p.goal || 'Undefined'}</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        alert(`Training request sent to HR for ${p.name}'s goal: ${p.goal}`);
                                                    }}
                                                    className="flex items-center gap-1 px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] rounded border border-red-500/20 transition-colors"
                                                >
                                                    <Target size={10} />
                                                    REQ. TRAINING
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 theme-text-secondary text-sm border-2 border-dashed border-gray-200 dark:border-white/5 rounded-lg bg-gray-50 dark:bg-transparent">
                                    No operatives identified as high risk.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Growth Velocity */}
                    <div className="theme-bg-secondary border border-green-500/30 rounded-xl overflow-hidden shadow-2xl relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Zap size={100} className="text-green-500" />
                        </div>
                        <div className="p-5 border-b border-green-500/20 flex items-center justify-between bg-green-50 dark:bg-green-900/10">
                            <h3 className="font-bold flex items-center gap-2 text-green-600 dark:text-green-500">
                                <Zap size={18} />
                                GROWTH VELOCITY
                            </h3>
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30">ACCELERATING</span>
                        </div>
                        <div className="p-4 space-y-3">
                            {accelerating.length > 0 ? (
                                accelerating.map((p: any) => (
                                    <div key={p.id} className="bg-gray-50 dark:bg-black/40 border border-green-500/20 p-3 rounded flex items-center justify-between group hover:border-green-500/50 transition-colors shadow-sm">
                                        <div>
                                            <div
                                                className="font-bold text-gray-200 cursor-pointer hover:text-green-400 transition-colors"
                                                onClick={() => handleViewEmployee(p.id)}
                                            >
                                                {p.name}
                                            </div>
                                            <div className="text-[10px] text-green-400 mt-1 flex gap-2">
                                                {p.factors.map((f: string, i: number) => (
                                                    <span key={i} className="bg-green-500/10 px-1 rounded">{f}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-gray-400">Projected ELO</div>
                                            <div className="font-mono text-green-500 font-bold">{p.projectedElo} <span className="text-[10px]">↑</span></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 theme-text-secondary text-sm border-2 border-dashed border-gray-200 dark:border-white/5 rounded-lg bg-gray-50 dark:bg-transparent">
                                    No operatives currently accelerating.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. Skill Matrix Heatmap */}
                <div className="theme-bg-secondary border theme-border rounded-xl overflow-hidden shadow-2xl">
                    <div className="p-5 border-b theme-border flex items-center justify-between bg-gray-50 dark:bg-black/20">
                        <h3 className="font-bold flex items-center gap-2 theme-text-primary">
                            <LayoutGrid className="text-cyan-500" size={18} />
                            UNIT SKILL MATRIX
                        </h3>
                        <p className="text-xs theme-text-secondary ml-2">
                            Aggregated average from all completed training scenarios in each skill category.
                        </p>
                        <div className="flex items-center gap-2 text-[10px] theme-text-secondary">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-600"></div> Low</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-cyan-600"></div> Mid</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-cyan-500 text-cyan-500 shadow-[0_0_5px_currentColor]"></div> High</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500 text-emerald-500 shadow-[0_0_5px_currentColor]"></div> Elite</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr>
                                    <th className="p-4 bg-gray-100 dark:bg-black/30 theme-text-secondary font-medium border-b border-r theme-border sticky left-0 z-10 w-48 backdrop-blur-md">OPERATIVE</th>
                                    {matrixSkills.map(skill => (
                                        <th key={skill} className="p-4 bg-gray-100 dark:bg-black/30 theme-text-secondary font-medium border-b theme-border text-center min-w-[100px]">
                                            {skill.split(' ').map(w => w[0]).join('')} <br />
                                            <span className="text-[9px] opacity-60 font-normal">{skill}</span>
                                        </th>
                                    ))}
                                    <th className="p-4 bg-gray-100 dark:bg-black/30 theme-text-secondary font-medium border-b theme-border text-center">AVG</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamMembers.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="p-4 border-b border-r theme-border font-medium theme-text-primary bg-theme-bg-secondary sticky left-0 z-10 group-hover:bg-gray-100 dark:group-hover:bg-gray-800/80 transition-colors">
                                            <div
                                                className="flex items-center gap-2 cursor-pointer hover:text-cyan-400 transition-colors"
                                                onClick={() => handleViewEmployee(emp.id)}
                                            >
                                                <div className={`w-2 h-2 rounded-full ${emp.id === topPerformer?.id ? 'bg-yellow-500 shadow-[0_0_8px_gold]' : 'bg-cyan-500/50'}`} />
                                                {emp.name}
                                            </div>
                                        </td>
                                        {matrixSkills.map(skill => {
                                            // skills_profile stores values as 0-100 integers
                                            const score = Math.round(emp.skills_profile?.[skill] || 0);
                                            return (
                                                <td key={skill} className="p-3 border-b theme-border text-center relative">
                                                    <div className="flex items-center justify-center">
                                                        {score > 0 ? (
                                                            <div className={`w-12 h-8 rounded flex items-center justify-center text-xs font-bold text-white transition-all hover:scale-110 cursor-help ${getScoreColor(score)}`} title={`${skill}: ${score}%`}>
                                                                {score}
                                                            </div>
                                                        ) : (
                                                            <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-white/5" />
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="p-4 border-b theme-border text-center font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                                            {emp.skills_profile && Object.keys(emp.skills_profile).length > 0
                                                ? Math.round((Object.values(emp.skills_profile) as number[]).reduce((a, b) => a + b, 0) / Object.values(emp.skills_profile).length)
                                                : 0}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 5. Activity Graph (Bottom) */}
                <div className="theme-bg-secondary p-6 rounded-xl border theme-border">
                    <h3 className="font-bold flex items-center gap-2 theme-text-primary mb-6">
                        <Activity className="text-cyan-500" size={18} />
                        UNIT TRAJECTORY
                    </h3>
                    <p className="text-xs theme-text-secondary mb-6 ml-1">
                        Reflects the daily volume of training missions completed by the unit over the last 30 days.
                    </p>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics?.activityTimeline || []}>
                                <defs>
                                    <linearGradient id="gradActivity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 10 }} tickFormatter={(value) => value.slice(5)} />
                                <YAxis stroke="#666" tick={{ fontSize: 10 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey={user?.department || 'Engineering'} stroke="#06b6d4" strokeWidth={2} fill="url(#gradActivity)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <EmployeeDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                employee={selectedEmployee}
            />
        </div>
    );
};
