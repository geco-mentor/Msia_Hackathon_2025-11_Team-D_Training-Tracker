import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, Trophy, Search, Filter, LogOut, Shield, Terminal, AlertCircle, Target, Briefcase, TrendingUp, Award, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { EmployeeDetailsModal } from '../components/EmployeeDetailsModal';

export const AdminDashboard: React.FC = () => {
    const { logout, token } = useAuth();
    const navigate = useNavigate();
    const [employees, setEmployees] = React.useState<any[]>([]);
    const [analytics, setAnalytics] = React.useState<any>(null);
    const [selectedEmployee, setSelectedEmployee] = React.useState<any>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Employees
                const empResponse = await import('../api/employee').then(m => m.employeeAPI.getAllEmployees());
                if (empResponse.success) {
                    setEmployees(empResponse.employees);
                }

                // Fetch Analytics
                if (token) {
                    const analyticsResponse = await fetch('/api/analytics/overview', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const analyticsData = await analyticsResponse.json();
                    if (analyticsData.success) {
                        setAnalytics(analyticsData.data);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            }
        };
        fetchData();
    }, [token]);

    const handleViewEmployee = async (id: string) => {
        try {
            // Fetch detailed stats
            const response = await fetch(`/api/employees/${id}/details`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
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

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-cyan-50 font-mono selection:bg-cyan-500/30">
            {/* Top Bar */}
            <div className="h-14 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <Shield className="text-purple-500" size={20} />
                    <span className="font-bold tracking-wider text-purple-500">ADMIN ACCESS</span>
                    <span className="text-xs text-white/40">|</span>
                    <span className="text-xs text-white/60">SYSTEM OVERVIEW</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                        <AlertCircle size={12} />
                        <span>LIVE MONITORING</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="ml-2 flex items-center gap-2 px-3 py-1 border border-red-500/30 text-red-400 rounded hover:bg-red-500/10 transition-colors text-xs font-mono"
                    >
                        <LogOut size={12} />
                        LOGOUT
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-8 animate-enter">
                {/* Header Section */}
                <div className="flex items-end justify-between border-b border-white/10 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-2">
                            COMMAND CENTER
                        </h1>
                        <p className="text-white/60 text-sm flex items-center gap-2">
                            <Terminal size={14} />
                            Manage operatives and track system-wide performance.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate('/admin/create-assessment')}
                            className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-white/10 hover:border-blue-500/50 text-blue-400 text-sm rounded transition-all"
                        >
                            <Briefcase size={16} />
                            CREATE_ASSESSMENT
                        </button>
                    </div>
                </div>

                {/* Analytics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: Active Operatives */}
                    <div className="bg-[#111] border border-purple-500/30 p-6 rounded-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users size={64} />
                        </div>
                        <p className="text-purple-400 text-xs font-bold tracking-wider mb-1">ACTIVE OPERATIVES</p>
                        <h3 className="text-4xl font-bold text-white mb-4">{employees.length}</h3>
                        <div className="flex items-center text-xs text-white/60">
                            <span className="text-green-400 flex items-center gap-1 bg-green-400/10 px-1.5 py-0.5 rounded mr-2">
                                <Activity size={10} /> +12%
                            </span>
                            vs last cycle
                        </div>
                    </div>

                    {/* Card 2: Avg Completion Rate */}
                    <div className="bg-[#111] border border-cyan-500/30 p-6 rounded-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Target size={64} />
                        </div>
                        <p className="text-cyan-400 text-xs font-bold tracking-wider mb-1">AVG. COMPLETION RATE</p>
                        <h3 className="text-4xl font-bold text-white mb-4">{analytics?.avgCompletionRate || 0}%</h3>
                        <div className="flex items-center text-xs text-white/60">
                            <span className="text-green-400 flex items-center gap-1 bg-green-400/10 px-1.5 py-0.5 rounded mr-2">
                                <Activity size={10} /> +5%
                            </span>
                            vs last cycle
                        </div>
                    </div>

                    {/* Card 3: Total Assessments */}
                    <div className="bg-[#111] border border-green-500/30 p-6 rounded-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Trophy size={64} />
                        </div>
                        <p className="text-green-400 text-xs font-bold tracking-wider mb-1">TOTAL ASSESSMENTS</p>
                        <h3 className="text-4xl font-bold text-white mb-4">{analytics?.totalAssessments || 0}</h3>
                        <div className="flex items-center text-xs text-white/60">
                            <span className="text-green-400 flex items-center gap-1 bg-green-400/10 px-1.5 py-0.5 rounded mr-2">
                                <Activity size={10} /> +8%
                            </span>
                            vs last cycle
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Activity Timeline */}
                    <div className="bg-[#111] border border-white/10 p-6 rounded-lg">
                        <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                            <Activity size={16} className="text-cyan-400" />
                            ACTIVITY_TIMELINE
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics?.activityTimeline || []}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 10 }} tickFormatter={(value) => value.slice(5)} />
                                    <YAxis stroke="#666" tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="#06b6d4" fillOpacity={1} fill="url(#colorCount)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Skill Distribution */}
                    <div className="bg-[#111] border border-white/10 p-6 rounded-lg">
                        <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                            <Target size={16} className="text-purple-400" />
                            SKILL_DISTRIBUTION
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics?.skillDistribution || []} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                    <XAxis type="number" stroke="#666" tick={{ fontSize: 10 }} />
                                    <YAxis dataKey="name" type="category" stroke="#666" tick={{ fontSize: 10 }} width={100} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="value" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Second Row of Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Department Performance */}
                    <div className="bg-[#111] border border-white/10 p-6 rounded-lg">
                        <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                            <BarChart3 size={16} className="text-green-400" />
                            DEPARTMENT_PERFORMANCE
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics?.departmentPerformance || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="department" stroke="#666" tick={{ fontSize: 10 }} />
                                    <YAxis stroke="#666" tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="avgScore" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Difficulty Breakdown */}
                    <div className="bg-[#111] border border-white/10 p-6 rounded-lg">
                        <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                            <Target size={16} className="text-orange-400" />
                            DIFFICULTY_BREAKDOWN
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={analytics?.difficultyBreakdown || []}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="count"
                                        nameKey="difficulty"
                                        label={({ name, percent }) => name && percent !== undefined ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                                        labelLine={false}
                                    >
                                        {(analytics?.difficultyBreakdown || []).map((_: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={['#22c55e', '#eab308', '#ef4444', '#8b5cf6'][index % 4]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Monthly Trends */}
                    <div className="bg-[#111] border border-white/10 p-6 rounded-lg">
                        <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                            <TrendingUp size={16} className="text-blue-400" />
                            MONTHLY_TRENDS
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics?.monthlyTrends || []}>
                                    <defs>
                                        <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="month" stroke="#666" tick={{ fontSize: 10 }} />
                                    <YAxis stroke="#666" tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="assessments" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMonthly)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Top Performers Section */}
                <div className="bg-[#111] border border-white/10 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-white/5">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <Award size={16} className="text-yellow-400" />
                            TOP_PERFORMERS
                        </h2>
                    </div>
                    <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {(analytics?.topPerformers || []).slice(0, 5).map((performer: any, index: number) => (
                                <div
                                    key={performer.id}
                                    className={`p-4 rounded-lg border transition-all hover:scale-105 ${index === 0 ? 'bg-yellow-500/10 border-yellow-500/30' :
                                        index === 1 ? 'bg-gray-300/10 border-gray-300/30' :
                                            index === 2 ? 'bg-orange-500/10 border-orange-500/30' :
                                                'bg-white/5 border-white/10'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`text-2xl font-bold ${index === 0 ? 'text-yellow-400' :
                                            index === 1 ? 'text-gray-300' :
                                                index === 2 ? 'text-orange-400' :
                                                    'text-white/60'
                                            }`}>#{index + 1}</span>
                                        <div>
                                            <p className="font-bold text-white truncate">{performer.name}</p>
                                            <p className="text-xs text-white/40">{performer.department}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-white/60">Points</span>
                                        <span className="text-cyan-400 font-bold">{performer.total_points}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Users Table Section */}
                <div className="bg-[#111] border border-white/10 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <Activity size={16} className="text-cyan-400" />
                            OPERATIVE_PERFORMANCE_LOG
                        </h2>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                                <input
                                    type="text"
                                    placeholder="SEARCH_ID..."
                                    className="pl-9 pr-4 py-1.5 bg-black/50 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-cyan-500/50 w-64 placeholder:text-white/20"
                                />
                            </div>
                            <button className="p-1.5 border border-white/10 rounded hover:bg-white/5 text-white/60">
                                <Filter size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-black/40 text-white/40 uppercase font-mono">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Operative</th>
                                    <th className="px-6 py-3 font-medium">Role</th>
                                    <th className="px-6 py-3 font-medium">Department</th>
                                    <th className="px-6 py-3 font-medium">Progress</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {employees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-white group-hover:text-cyan-400 transition-colors">
                                            {emp.name}
                                        </td>
                                        <td className="px-6 py-4 text-white/60">{emp.role}</td>
                                        <td className="px-6 py-4 text-white/60">{emp.department}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-full max-w-[100px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                                        style={{ width: `${emp.progress}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-cyan-400 font-mono">{emp.progress}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] border ${emp.status === 'Active'
                                                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                                : 'bg-white/5 border-white/10 text-white/40'
                                                }`}>
                                                {emp.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleViewEmployee(emp.id)}
                                                className="text-white/40 hover:text-cyan-400 transition-colors"
                                            >
                                                REVIEW
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
