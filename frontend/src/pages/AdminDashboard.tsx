import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, Trophy, Search, Filter, LogOut, Shield, Terminal, AlertCircle, Target, Briefcase, TrendingUp, Award, BarChart3, Sun, Moon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts';
import { EmployeeDetailsModal } from '../components/EmployeeDetailsModal';

export const AdminDashboard: React.FC = () => {
    const { logout, token } = useAuth();
    const { toggleTheme, isDark } = useTheme();
    const navigate = useNavigate();
    const [employees, setEmployees] = React.useState<any[]>([]);
    const [analytics, setAnalytics] = React.useState<any>(null);
    const [selectedEmployee, setSelectedEmployee] = React.useState<any>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);
    const [selectedDepartment, setSelectedDepartment] = React.useState('all');
    const [selectedCurriculum, setSelectedCurriculum] = React.useState('all');

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

                // Fetch Analytics with filters
                if (token) {
                    const params = new URLSearchParams();
                    if (selectedDepartment !== 'all') params.append('department', selectedDepartment);
                    if (selectedCurriculum !== 'all') params.append('curriculum', selectedCurriculum);

                    const analyticsResponse = await fetch(`/api/analytics/overview?${params.toString()}`, {
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
    }, [token, selectedDepartment, selectedCurriculum]);

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
        <div className="min-h-screen theme-bg-primary theme-text-primary font-mono selection:bg-cyan-500/30 dark:selection:bg-cyan-500/30">
            {/* Top Bar */}
            <div className="h-14 border-b theme-border theme-bg-nav backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <Shield className="text-purple-600 dark:text-purple-500" size={20} />
                    <span className="font-bold tracking-wider text-purple-600 dark:text-purple-500">ADMIN ACCESS</span>
                    <span className="text-xs theme-text-muted">|</span>
                    <span className="text-xs theme-text-secondary">SYSTEM OVERVIEW</span>
                </div>
                <div className="flex items-center gap-4">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="theme-toggle"
                        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    </button>

                    <button
                        onClick={() => navigate('/leaderboard')}
                        className="flex items-center gap-2 px-3 py-1 border border-yellow-500/30 text-yellow-600 dark:text-yellow-500 rounded hover:bg-yellow-500/10 transition-colors text-xs font-mono"
                    >
                        <Trophy size={12} />
                        RANKINGS
                    </button>

                    <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-500/10 border border-red-500/20 rounded text-xs text-red-600 dark:text-red-400">
                        <AlertCircle size={12} />
                        <span>LIVE MONITORING</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-1 border border-red-500/30 text-red-600 dark:text-red-400 rounded hover:bg-red-500/10 transition-colors text-xs font-mono"
                    >
                        <LogOut size={12} />
                        LOGOUT
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-8 animate-enter">
                {/* Header Section */}
                <div className="flex items-end justify-between border-b theme-border pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 dark:from-purple-400 to-cyan-600 dark:to-cyan-400 mb-2">
                            COMMAND CENTER
                        </h1>
                        <p className="theme-text-secondary text-sm flex items-center gap-2">
                            <Terminal size={14} />
                            Manage operatives and track system-wide performance.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate('/admin/create-assessment')}
                            className="flex items-center gap-2 px-4 py-2 theme-bg-secondary border theme-border hover:border-blue-500/50 text-blue-600 dark:text-blue-400 text-sm rounded transition-all"
                        >
                            <Briefcase size={16} />
                            CREATE_ASSESSMENT
                        </button>
                    </div>
                </div>

                {/* Analytics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: Active Operatives */}
                    <div className="theme-bg-secondary border border-purple-500/30 p-6 rounded-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users size={64} />
                        </div>
                        <p className="text-purple-600 dark:text-purple-400 text-xs font-bold tracking-wider mb-1">ACTIVE OPERATIVES</p>
                        <h3 className="text-4xl font-bold theme-text-primary mb-4">{employees.length}</h3>
                        <div className="flex items-center text-xs theme-text-secondary">
                            <span className="text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-100 dark:bg-green-400/10 px-1.5 py-0.5 rounded mr-2">
                                <Activity size={10} /> +12%
                            </span>
                            vs last cycle
                        </div>
                    </div>

                    {/* Card 2: Avg Completion Rate */}
                    <div className="theme-bg-secondary border border-cyan-500/30 p-6 rounded-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Target size={64} />
                        </div>
                        <p className="text-cyan-600 dark:text-cyan-400 text-xs font-bold tracking-wider mb-1">AVG. COMPLETION RATE</p>
                        <h3 className="text-4xl font-bold theme-text-primary mb-4">{analytics?.avgCompletionRate || 0}%</h3>
                        <div className="flex items-center text-xs theme-text-secondary">
                            <span className="text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-100 dark:bg-green-400/10 px-1.5 py-0.5 rounded mr-2">
                                <Activity size={10} /> +5%
                            </span>
                            vs last cycle
                        </div>
                    </div>

                    {/* Card 3: Total Assessments */}
                    <div className="theme-bg-secondary border border-green-500/30 p-6 rounded-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Trophy size={64} />
                        </div>
                        <p className="text-green-600 dark:text-green-400 text-xs font-bold tracking-wider mb-1">TOTAL ASSESSMENTS</p>
                        <h3 className="text-4xl font-bold theme-text-primary mb-4">{analytics?.totalAssessments || 0}</h3>
                        <div className="flex items-center text-xs theme-text-secondary">
                            <span className="text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-100 dark:bg-green-400/10 px-1.5 py-0.5 rounded mr-2">
                                <Activity size={10} /> +8%
                            </span>
                            vs last cycle
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Activity Timeline */}
                    <div className="theme-bg-secondary border theme-border p-6 rounded-lg">
                        <h3 className="text-sm font-bold theme-text-primary mb-6 flex items-center gap-2">
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

                    {/* Pre vs Post Assessment */}
                    <div className="theme-bg-secondary border theme-border p-6 rounded-lg">
                        <div className="mb-4">
                            <h3 className="text-sm font-bold theme-text-primary flex items-center gap-2 mb-3">
                                <Target size={16} className="text-purple-400" />
                                PRE_VS_POST_ASSESSMENT
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {/* Department Filter */}
                                <select
                                    value={selectedDepartment}
                                    onChange={(e) => setSelectedDepartment(e.target.value)}
                                    className="bg-black/50 border theme-border rounded px-3 py-1.5 text-xs theme-text-primary focus:outline-none focus:border-purple-500/50 min-w-[140px]"
                                >
                                    <option value="all">All Departments</option>
                                    {(analytics?.departments || []).map((dept: any) => (
                                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                                    ))}
                                </select>
                                {/* Curriculum Filter */}
                                <select
                                    value={selectedCurriculum}
                                    onChange={(e) => setSelectedCurriculum(e.target.value)}
                                    className="bg-black/50 border theme-border rounded px-3 py-1.5 text-xs theme-text-primary focus:outline-none focus:border-purple-500/50 min-w-[140px]"
                                >
                                    <option value="all">All Curriculums</option>
                                    {(analytics?.curriculums || []).map((curr: any) => (
                                        <option key={curr.id} value={curr.id}>{curr.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="h-64 w-full">
                            {(analytics?.preVsPostAssessment?.length || 0) > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics?.preVsPostAssessment || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                        <XAxis dataKey="curriculum" stroke="#666" tick={{ fontSize: 10 }} />
                                        <YAxis stroke="#666" tick={{ fontSize: 10 }} domain={[0, 100]} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value: number, name: string) => [
                                                `${value}%`,
                                                name === 'preScore' ? 'Pre Assessment' : 'Post Assessment'
                                            ]}
                                        />
                                        <Legend
                                            formatter={(value) => value === 'preScore' ? 'Pre Assessment' : 'Post Assessment'}
                                            wrapperStyle={{ fontSize: '10px' }}
                                        />
                                        <Bar dataKey="preScore" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={20} name="preScore" />
                                        <Bar dataKey="postScore" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={20} name="postScore" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center theme-text-primary/40 text-sm">
                                    No assessment data available
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Second Row of Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Department Performance */}
                    <div className="theme-bg-secondary border theme-border p-6 rounded-lg">
                        <h3 className="text-sm font-bold theme-text-primary mb-6 flex items-center gap-2">
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

                    {/* Skills Gap Analysis */}
                    <div className="theme-bg-secondary border theme-border p-6 rounded-lg">
                        <h3 className="text-sm font-bold theme-text-primary mb-6 flex items-center gap-2">
                            <Target size={16} className="text-orange-400" />
                            SKILLS_GAP_ANALYSIS
                        </h3>
                        <div className="h-64 w-full">
                            {(analytics?.skillsGap?.length || 0) > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics?.skillsGap || []} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                        <XAxis type="number" stroke="#666" tick={{ fontSize: 10 }} domain={[0, 100]} />
                                        <YAxis dataKey="skill" type="category" stroke="#666" tick={{ fontSize: 10 }} width={80} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value: number) => [`${value}%`, 'Avg Score']}
                                        />
                                        <Bar
                                            dataKey="avgScore"
                                            radius={[0, 4, 4, 0]}
                                            barSize={20}
                                        >
                                            {(analytics?.skillsGap || []).map((_: any, index: number) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={
                                                        (analytics?.skillsGap[index]?.avgScore || 0) < 40 ? '#ef4444' :
                                                            (analytics?.skillsGap[index]?.avgScore || 0) < 60 ? '#eab308' :
                                                                '#22c55e'
                                                    }
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center theme-text-primary/40 text-sm">
                                    No skills data available
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Module Effectiveness */}
                    <div className="theme-bg-secondary border theme-border p-6 rounded-lg">
                        <h3 className="text-sm font-bold theme-text-primary mb-6 flex items-center gap-2">
                            <TrendingUp size={16} className="text-blue-400" />
                            MODULE_EFFECTIVENESS
                        </h3>
                        <div className="h-64 w-full">
                            {(analytics?.moduleEffectiveness?.length || 0) > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics?.moduleEffectiveness || []} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                        <XAxis type="number" stroke="#666" tick={{ fontSize: 10 }} />
                                        <YAxis dataKey="curriculum" type="category" stroke="#666" tick={{ fontSize: 9 }} width={100} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value: number, name: string) => [
                                                name === 'improvement' ? `${value >= 0 ? '+' : ''}${value}%` : `${value}%`,
                                                name === 'improvement' ? 'Improvement' : name === 'preScore' ? 'Pre' : 'Post'
                                            ]}
                                        />
                                        <Bar dataKey="improvement" radius={[0, 4, 4, 0]} barSize={16}>
                                            {(analytics?.moduleEffectiveness || []).map((_: any, index: number) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={(analytics?.moduleEffectiveness[index]?.improvement || 0) >= 0 ? '#22c55e' : '#ef4444'}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center theme-text-primary/40 text-sm">
                                    No module effectiveness data
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Third Row: Improvement Trend + At-Risk Employees */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Improvement Trend */}
                    <div className="theme-bg-secondary border theme-border p-6 rounded-lg">
                        <h3 className="text-sm font-bold theme-text-primary mb-6 flex items-center gap-2">
                            <TrendingUp size={16} className="text-cyan-400" />
                            IMPROVEMENT_TREND
                        </h3>
                        <div className="h-64 w-full">
                            {(analytics?.improvementTrend?.length || 0) > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analytics?.improvementTrend || []}>
                                        <defs>
                                            <linearGradient id="colorImprovement" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                        <XAxis dataKey="month" stroke="#666" tick={{ fontSize: 10 }} />
                                        <YAxis stroke="#666" tick={{ fontSize: 10 }} domain={[0, 100]} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value: number) => [`${value}%`, 'Avg Score']}
                                        />
                                        <Area type="monotone" dataKey="avgScore" stroke="#06b6d4" fillOpacity={1} fill="url(#colorImprovement)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center theme-text-primary/40 text-sm">
                                    No trend data available
                                </div>
                            )}
                        </div>
                    </div>

                    {/* At-Risk Employees */}
                    <div className="theme-bg-secondary border border-red-500/30 p-6 rounded-lg">
                        <h3 className="text-sm font-bold theme-text-primary mb-4 flex items-center gap-2">
                            <AlertCircle size={16} className="text-red-400" />
                            AT_RISK_EMPLOYEES
                            {(analytics?.atRiskEmployees?.length || 0) > 0 && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-red-500/20 border border-red-500/30 rounded text-red-400">
                                    {analytics?.atRiskEmployees?.length} need attention
                                </span>
                            )}
                        </h3>
                        <div className="h-64 overflow-y-auto space-y-2">
                            {(analytics?.atRiskEmployees?.length || 0) > 0 ? (
                                (analytics?.atRiskEmployees || []).map((emp: any) => (
                                    <div
                                        key={emp.id}
                                        className="flex items-center justify-between p-3 bg-black/30 border border-white/5 rounded hover:border-red-500/30 transition-colors"
                                    >
                                        <div>
                                            <p className="theme-text-primary font-medium text-sm">{emp.name}</p>
                                            <p className="theme-text-primary/40 text-xs">{emp.department}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs px-2 py-0.5 rounded ${emp.trend === 'declining' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 theme-text-primary/60'
                                                }`}>
                                                {emp.trend === 'declining' ? '↓ Declining' : 'Low Score'}
                                            </span>
                                            <span className={`text-lg font-bold ${emp.avgScore < 30 ? 'text-red-400' : emp.avgScore < 50 ? 'text-orange-400' : 'text-yellow-400'
                                                }`}>
                                                {emp.avgScore}%
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex items-center justify-center text-green-400 text-sm">
                                    ✓ No at-risk employees
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Top Performers Section */}
                <div className="theme-bg-secondary border theme-border rounded-lg overflow-hidden">
                    <div className="p-4 border-b theme-border bg-white/5">
                        <h2 className="text-sm font-bold theme-text-primary flex items-center gap-2">
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
                                                'bg-white/5 theme-border'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`text-2xl font-bold ${index === 0 ? 'text-yellow-400' :
                                            index === 1 ? 'text-gray-300' :
                                                index === 2 ? 'text-orange-400' :
                                                    'theme-text-primary/60'
                                            }`}>#{index + 1}</span>
                                        <div>
                                            <p className="font-bold theme-text-primary truncate">{performer.name}</p>
                                            <p className="text-xs theme-text-primary/40">{performer.department}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="theme-text-primary/60">Points</span>
                                        <span className="text-cyan-400 font-bold">{performer.total_points}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Users Table Section */}
                <div className="theme-bg-secondary border theme-border rounded-lg overflow-hidden">
                    <div className="p-4 border-b theme-border flex items-center justify-between bg-white/5">
                        <h2 className="text-sm font-bold theme-text-primary flex items-center gap-2">
                            <Activity size={16} className="text-cyan-400" />
                            OPERATIVE_PERFORMANCE_LOG
                        </h2>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 theme-text-primary/40" size={14} />
                                <input
                                    type="text"
                                    placeholder="SEARCH_ID..."
                                    className="pl-9 pr-4 py-1.5 bg-black/50 border theme-border rounded text-xs theme-text-primary focus:outline-none focus:border-cyan-500/50 w-64 placeholder:theme-text-primary/20"
                                />
                            </div>
                            <button className="p-1.5 border theme-border rounded hover:bg-white/5 theme-text-primary/60">
                                <Filter size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-black/40 theme-text-primary/40 uppercase font-mono">
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
                                        <td className="px-6 py-4 font-medium theme-text-primary group-hover:text-cyan-400 transition-colors">
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