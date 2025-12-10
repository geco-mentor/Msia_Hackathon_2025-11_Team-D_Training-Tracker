import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, Trophy, Search, Filter, LogOut, Shield, Terminal, AlertCircle, Target, Briefcase, Sun, Moon, LayoutGrid, Zap } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { EmployeeDetailsModal } from '../components/EmployeeDetailsModal';

export const AdminDashboard: React.FC = () => {
    const { logout, token } = useAuth();
    const { toggleTheme, isDark } = useTheme();
    const navigate = useNavigate();
    const [employees, setEmployees] = React.useState<any[]>([]);
    const [analytics, setAnalytics] = React.useState<any>(null);
    const [selectedEmployee, setSelectedEmployee] = React.useState<any>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);
    const [selectedDepartment] = React.useState('all');
    const [selectedCurriculum] = React.useState('all');

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

                    {/* Card 3: Training ROI */}
                    <div className="theme-bg-secondary border border-yellow-500/30 p-6 rounded-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Zap size={64} />
                        </div>
                        <p className="text-yellow-600 dark:text-yellow-400 text-xs font-bold tracking-wider mb-1">TRAINING ROI</p>
                        <h3 className="text-4xl font-bold theme-text-primary mb-4">+{analytics?.trainingROI || 0}%</h3>
                        <div className="flex items-center text-xs theme-text-secondary">
                            <span className="theme-text-primary/60">Skill Improvement</span>
                        </div>
                    </div>

                    {/* Card 4: Total Assessments */}
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
                    {/* Activity Timeline (Stacked Area) */}
                    <div className="theme-bg-secondary border theme-border p-6 rounded-lg">
                        <h3 className="text-sm font-bold theme-text-primary mb-6 flex items-center gap-2">
                            <Activity size={16} className="text-cyan-400" />
                            DEPARTMENT_ACTIVITY_LOG
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics?.activityTimeline || []}>
                                    <defs>
                                        <linearGradient id="gradEng" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradFinance" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#ffc658" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradOther" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ff7300" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#ff7300" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 10 }} tickFormatter={(value) => value.slice(5)} />
                                    <YAxis stroke="#666" tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                                        labelStyle={{ color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                                    {/* Dynamically generate Areas would be ideal but hardcoded for main depts is safer for now */}
                                    <Area type="monotone" dataKey="Engineering" stackId="1" stroke="#8884d8" fill="url(#gradEng)" />
                                    <Area type="monotone" dataKey="Sales" stackId="1" stroke="#82ca9d" fill="url(#gradSales)" />
                                    <Area type="monotone" dataKey="Finance" stackId="1" stroke="#ffc658" fill="url(#gradFinance)" />
                                    <Area type="monotone" dataKey="Other" stackId="1" stroke="#ff7300" fill="url(#gradOther)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Updated: Training Impact Analysis (Pre/Post/Effectiveness Combined) */}
                    <div className="theme-bg-secondary border theme-border p-6 rounded-lg">
                        <div className="mb-4">
                            <h3 className="text-sm font-bold theme-text-primary flex items-center gap-2 mb-3">
                                <Target size={16} className="text-purple-400" />
                                TRAINING_IMPACT_ANALYSIS
                            </h3>
                            <div className="flex flex-wrap gap-2 text-xs theme-text-secondary">
                                Displays Pre and Post assessment scores to visualize training effectiveness across modules.
                            </div>
                        </div>
                        <div className="h-64 w-full">
                            {(analytics?.preVsPostAssessment?.length || 0) > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={analytics?.preVsPostAssessment || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                        <XAxis dataKey="curriculum" stroke="#666" tick={{ fontSize: 10 }} />
                                        <YAxis stroke="#666" tick={{ fontSize: 10 }} domain={[0, 100]} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                                            labelStyle={{ color: '#fff' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value: number, name: string) => [
                                                `${value}%`,
                                                name === 'preScore' ? 'Pre-Assessment' : name === 'postScore' ? 'Post-Assessment' : 'Score'
                                            ]}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                                        <Line type="monotone" dataKey="preScore" stroke="#a855f7" strokeWidth={2} name="Pre-Assessment" dot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="postScore" stroke="#06b6d4" strokeWidth={2} name="Post-Assessment" dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center theme-text-primary/40 text-sm">
                                    No assessment data available
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Heatmap Row (Replacing old Skills Gap & Module Effectiveness) */}
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                    {/* Skill Adoption Heatmap (Moved from bottom) */}
                    <div className="theme-bg-secondary border theme-border rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-bold theme-text-primary flex items-center gap-2">
                                <LayoutGrid size={16} className="text-orange-500" />
                                SKILL_ADOPTION_MATRIX (HEATMAP)
                            </h3>
                            <div className="flex items-center gap-4 text-[10px] md:text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 md:w-3 md:h-3 bg-amber-100"></div>
                                    <span className="theme-text-secondary">Novice</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 md:w-3 md:h-3 bg-orange-400"></div>
                                    <span className="theme-text-secondary">Proficient</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 md:w-3 md:h-3 bg-red-700"></div>
                                    <span className="theme-text-primary">Expert</span>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            {analytics?.skillHeatmap && analytics.skillHeatmap.length > 0 ? (
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="p-2 text-left theme-text-secondary font-mono border-b theme-border bg-black/20">SKILL \ TEAM</th>
                                            {analytics.skillHeatmap.map((dept: any, i: number) => (
                                                <th key={i} className="p-2 theme-text-primary font-bold border-b theme-border text-center min-w-[80px] bg-black/20">
                                                    {dept.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from(new Set(analytics.skillHeatmap.flatMap((d: any) => d.skills.map((s: any) => s.name))))
                                            .sort()
                                            .map((skillName: any, rowIndex) => (
                                                <tr key={rowIndex} className="border-b border-white/5">
                                                    <td className="p-2 theme-text-primary/80 font-medium border-r theme-border bg-black/10 text-[10px] md:text-xs">
                                                        {skillName}
                                                    </td>
                                                    {analytics.skillHeatmap.map((dept: any, colIndex: number) => {
                                                        const skillData = dept.skills.find((s: any) => s.name === skillName);
                                                        const value = skillData ? skillData.value : 0;

                                                        let bgColor = 'bg-white/5';
                                                        let textColor = 'text-transparent';
                                                        let content = '-';

                                                        if (value > 0) {
                                                            content = value.toFixed(2);
                                                            if (value < 0.3) {
                                                                bgColor = 'bg-amber-100/90 hover:bg-amber-100';
                                                                textColor = 'text-amber-900';
                                                            } else if (value < 0.7) {
                                                                bgColor = 'bg-orange-400/90 hover:bg-orange-400';
                                                                textColor = 'text-orange-950';
                                                            } else {
                                                                bgColor = 'bg-red-700/90 hover:bg-red-700';
                                                                textColor = 'text-white';
                                                            }
                                                        }

                                                        return (
                                                            <td key={colIndex} className="p-0.5 text-center">
                                                                <div
                                                                    className={`w-full h-8 flex items-center justify-center rounded-sm transition-all ${bgColor} ${textColor} font-bold text-[10px]`}
                                                                    title={`${dept.name} - ${skillName}: ${value}`}
                                                                >
                                                                    {content}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 theme-text-secondary/40 border-2 border-dashed border-white/5 rounded-lg bg-black/20">
                                    <LayoutGrid size={32} className="mb-2 opacity-50" />
                                    <p>No skill adoption data available</p>
                                    <span className="text-xs opacity-50">Generate assessments to visualize skill matrix</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Top Performers / Employee List Section */}
                <div className="theme-bg-secondary border theme-border rounded-lg overflow-hidden">
                    <div className="p-4 border-b theme-border bg-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Trophy size={16} className="text-yellow-500" />
                            <h3 className="text-sm font-bold theme-text-primary">OPERATIVE_PERFORMANCE_LOG</h3>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative">
                                <input type="text" placeholder="SEARCH_ID..." className="bg-black/50 border theme-border rounded px-3 py-1 pl-8 text-xs theme-text-primary w-40" />
                                <Search size={12} className="absolute left-2.5 top-2 text-gray-500" />
                            </div>
                            <button className="p-1.5 border theme-border rounded hover:bg-white/5 text-gray-400">
                                <Filter size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-black/5 dark:bg-black/40 theme-text-secondary uppercase font-mono">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Operative</th>
                                    <th className="px-6 py-3 font-medium">Role</th>
                                    <th className="px-6 py-3 font-medium">Department</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                {(employees || []).slice(0, 10).map((emp) => (
                                    <tr key={emp.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 font-medium theme-text-primary group-hover:text-cyan-400 transition-colors">
                                            {emp.name}
                                        </td>
                                        <td className="px-6 py-4 theme-text-secondary">{emp.role}</td>
                                        <td className="px-6 py-4 theme-text-secondary">{emp.department}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] border ${emp.status === 'Active'
                                                ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'
                                                : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 theme-text-secondary'
                                                }`}>
                                                {emp.status ? emp.status.toUpperCase() : 'ACTIVE'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleViewEmployee(emp.id)}
                                                className="theme-text-secondary hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                                            >
                                                REVIEW
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination Footer */}
                    <div className="p-4 border-t theme-border flex items-center justify-between text-xs theme-text-secondary">
                        <span className="font-mono">Showing {Math.min(employees.length, 10)} of {employees.length} operatives</span>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 border theme-border rounded hover:bg-white/5 disabled:opacity-50 transition-colors" disabled>PREV</button>
                            <button className="px-3 py-1 border theme-border rounded hover:bg-white/5 disabled:opacity-50 transition-colors" disabled>NEXT</button>
                        </div>
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