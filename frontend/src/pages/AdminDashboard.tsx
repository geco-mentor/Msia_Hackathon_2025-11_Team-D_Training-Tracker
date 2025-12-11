import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, Trophy, Search, LogOut, Shield, Terminal, Target, Briefcase, Sun, Moon, LayoutGrid, Download } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { EmployeeDetailsModal } from '../components/EmployeeDetailsModal';
import { KpiCard } from '../components/KpiCard';
import { LastRefreshed } from '../components/LastRefreshed';
import { ColumnToggle } from '../components/ColumnToggle';
import { TrainingImpactModal } from '../components/TrainingImpactModal';
import { exportToCsv } from '../utils/csvExport';
import html2canvas from 'html2canvas';

// Define available table columns
const TABLE_COLUMNS = [
    { key: 'role', label: 'Role' },
    { key: 'department', label: 'Department' },
    { key: 'status', label: 'Status' },
    { key: 'goal', label: 'Goal Set' },
];

export const AdminDashboard: React.FC = () => {
    const { user, logout, token } = useAuth();
    const { toggleTheme, isDark } = useTheme();
    const navigate = useNavigate();

    // Data State
    const [employees, setEmployees] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    // Selection State
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    // Impact Drill Down
    const [impactModalOpen, setImpactModalOpen] = useState(false);
    const [selectedImpactCurriculum, setSelectedImpactCurriculum] = useState<{ id: string, name: string } | null>(null);

    // Filter/View State
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
        const saved = localStorage.getItem('admin_table_columns');
        return saved ? new Set(JSON.parse(saved)) : new Set(['role', 'department', 'status']);
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    const [searchTerm, setSearchTerm] = useState('');

    // Filters
    const [departments, setDepartments] = useState<any[]>([]);
    const [selectedDepartment, _setSelectedDepartment] = useState<string>('all');

    // Fetch Data
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch Employees
            const empResponse = await import('../api/employee').then(m => m.employeeAPI.getAllEmployees());
            if (empResponse.success) {
                setEmployees(empResponse.employees);
            }

            // Fetch Analytics
            if (token) {
                const queryParams = new URLSearchParams();
                if (selectedDepartment && selectedDepartment !== 'all') {
                    queryParams.append('department', selectedDepartment);
                }

                const analyticsResponse = await fetch(`/api/analytics/overview?${queryParams.toString()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const analyticsData = await analyticsResponse.json();
                if (analyticsData.success) {
                    setAnalytics(analyticsData.data);
                    // Set available departments from analytics data if not already populated
                    if (analyticsData.data.departments && departments.length === 0) {
                        setDepartments(analyticsData.data.departments);
                    }
                }
            }
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [token, selectedDepartment, departments.length]); // Added selectedDepartment and departments.length to dependencies

    useEffect(() => {
        if (token && user?.role === 'admin') { // Added user?.role check
            fetchData();
            // Auto-refresh every 5 minutes
            const interval = setInterval(fetchData, 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [token, user, selectedDepartment, fetchData]); // Added selectedDepartment and fetchData to dependencies

    // Handlers
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

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

    const handleColumnToggle = (key: string) => {
        const newSet = new Set(visibleColumns);
        if (newSet.has(key)) newSet.delete(key);
        else newSet.add(key);
        setVisibleColumns(newSet);
        localStorage.setItem('admin_table_columns', JSON.stringify(Array.from(newSet)));
    };

    const handleExportCsv = () => {
        const dataToExport = employees.map(emp => ({
            Operative: emp.name,
            Role: emp.role || 'N/A',
            Department: emp.department || 'N/A',
            Status: emp.status || 'Active',
            Points: emp.total_points || 0
        }));
        exportToCsv(dataToExport, `operative_performance_${new Date().toISOString().split('T')[0]}`);
    };

    const handleExportPng = async () => {
        const element = document.getElementById('admin-dashboard-container');
        if (element) {
            try {
                const canvas = await html2canvas(element, {
                    backgroundColor: isDark ? '#09090b' : '#ffffff', // Match theme bg
                    scale: 2 // Higher resolution
                });
                const link = document.createElement('a');
                link.download = `admin-dashboard-snapshot.png`;
                link.href = canvas.toDataURL();
                link.click();
            } catch (err) {
                console.error("Export failed", err);
            }
        }
    };

    const handleImpactClick = (data: any) => {
        if (data && data.activePayload && data.activePayload[0]) {
            const payload = data.activePayload[0].payload;
            if (payload && payload.id) {
                setSelectedImpactCurriculum({ id: payload.id, name: payload.fullTitle });
                setImpactModalOpen(true);
            }
        }
    };

    // Filtered Employees
    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
    const paginatedEmployees = filteredEmployees.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const departmentColors = {
        'Engineering': '#8884d8',
        'Sales': '#82ca9d',
        'Finance': '#ffc658',
        'Marketing': '#ff7300',
        'HR': '#ff7300',
        'Other': '#cccccc'
    };

    return (
        <div id="admin-dashboard-container" className="min-h-screen theme-bg-primary theme-text-primary font-mono selection:bg-cyan-500/30 dark:selection:bg-cyan-500/30 pb-12">
            {/* Top Bar */}
            <div className="h-14 border-b theme-border theme-bg-nav backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <Shield className="text-purple-600 dark:text-purple-500" size={20} />
                    <span className="font-bold tracking-wider text-purple-600 dark:text-purple-500 hidden sm:inline">ADMIN ACCESS</span>
                    <span className="text-xs theme-text-muted hidden sm:inline">|</span>
                    <span className="text-xs theme-text-secondary">SYSTEM OVERVIEW</span>
                </div>
                <div className="flex items-center gap-4">
                    <LastRefreshed lastUpdated={lastUpdated} onRefresh={fetchData} isLoading={isLoading} />

                    {/* Theme Toggle */}
                    <button onClick={toggleTheme} className="theme-toggle" title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
                        {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    </button>

                    <button
                        onClick={handleExportPng}
                        className="p-1.5 hover:bg-white/5 rounded-full transition-colors theme-text-secondary"
                        title="Export Snapshot"
                    >
                        <Download size={16} />
                    </button>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-1 border border-red-500/30 text-red-600 dark:text-red-400 rounded hover:bg-red-500/10 transition-colors text-xs font-mono"
                    >
                        <LogOut size={12} />
                        <span className="hidden sm:inline">LOGOUT</span>
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-8 animate-enter">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between border-b theme-border pb-6 gap-4">
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
                            className="flex items-center gap-2 px-4 py-2 theme-bg-secondary border theme-border hover:border-blue-500/50 text-blue-600 dark:text-blue-400 text-sm rounded transition-all shadow-sm hover:shadow-blue-500/10"
                        >
                            <Briefcase size={16} />
                            CREATE_ASSESSMENT
                        </button>
                    </div>
                </div>

                {/* KPI Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <KpiCard
                        title="ACTIVE OPERATIVES"
                        value={employees.length}
                        subtext="Total workforce"
                        icon={<Users size={24} />}
                        type="active"
                        isLoading={isLoading}
                    />


                    <KpiCard
                        title="TOTAL ASSESSMENTS"
                        value={analytics?.totalAssessments || 0}
                        subtext="vs last cycle"
                        trend="+8%"
                        icon={<Trophy size={24} />}
                        type="assessments"
                        isLoading={isLoading}
                    />
                </div>

                {/* KPI Methodology Info Panel */}
                <details className="theme-bg-secondary border theme-border rounded-lg p-4 bg-opacity-50 backdrop-blur-sm text-xs">
                    <summary className="cursor-pointer theme-text-primary font-bold flex items-center gap-2 hover:text-cyan-500 transition-colors">
                        <Target size={14} className="text-purple-400" />
                        📖 How are these metrics calculated? (Click to expand)
                    </summary>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 theme-text-secondary">
                        <div className="p-3 rounded bg-black/10 dark:bg-white/5 border border-dashed theme-border">
                            <strong className="text-blue-500 dark:text-blue-400">📊 Active Operatives</strong>
                            <p className="mt-1">Total count of employees in the system.</p>
                        </div>


                        <div className="p-3 rounded bg-black/10 dark:bg-white/5 border border-dashed theme-border">
                            <strong className="text-purple-500 dark:text-purple-400">🏆 Total Assessments</strong>
                            <p className="mt-1">Count of all assessment records in the database (pre + post).</p>
                        </div>
                    </div>
                </details>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Activity Timeline (Stacked Area) */}
                    <div className="theme-bg-secondary border theme-border p-6 rounded-lg bg-opacity-50 backdrop-blur-sm">
                        <h3 className="text-sm font-bold theme-text-primary mb-6 flex items-center gap-2">
                            <Activity size={16} className="text-cyan-400" />
                            DEPARTMENT_ACTIVITY_LOG
                        </h3>
                        <div className="h-64 w-full relative">
                            {isLoading ? (
                                <div className="absolute inset-0 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div></div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analytics?.activityTimeline || []}>
                                        <defs>
                                            {analytics?.departments?.map((dept: any) => (
                                                <linearGradient key={dept.id} id={`grad${dept.name.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={departmentColors[dept.name as keyof typeof departmentColors] || '#8884d8'} stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor={departmentColors[dept.name as keyof typeof departmentColors] || '#8884d8'} stopOpacity={0} />
                                                </linearGradient>
                                            ))}
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.5} />
                                        <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 10 }} tickFormatter={(value) => value.slice(5)} />
                                        <YAxis stroke="#666" tick={{ fontSize: 10 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333', borderRadius: '8px', backdropFilter: 'blur(4px)' }}
                                            labelStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                            itemStyle={{ color: '#fff', fontSize: '11px' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                                        {analytics?.departments?.map((dept: any) => (
                                            <Area
                                                key={dept.id}
                                                type="monotone"
                                                dataKey={dept.name}
                                                stackId="1"
                                                stroke={departmentColors[dept.name as keyof typeof departmentColors] || '#8884d8'}
                                                fill={`url(#grad${dept.name.replace(/\s+/g, '')})`}
                                            />
                                        ))}
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Training Impact Analysis (Line Chart) */}
                    <div className="theme-bg-secondary border theme-border p-6 rounded-lg bg-opacity-50 backdrop-blur-sm">
                        <div className="mb-4">
                            <h3 className="text-sm font-bold theme-text-primary flex items-center gap-2 mb-1">
                                <Target size={16} className="text-purple-400" />
                                TRAINING_IMPACT_ANALYSIS
                            </h3>
                            <p className="text-xs theme-text-secondary opacity-70 mb-2">
                                Pre vs Post assessment scores by curriculum. Click on points for details.
                            </p>
                            <div className="text-[9px] theme-text-secondary/60 p-2 bg-black/10 dark:bg-white/5 rounded border border-dashed theme-border">
                                <strong className="theme-text-primary">📐 Score Definition:</strong>
                                <span className="text-purple-400"> Pre-Assessment</span> = baseline knowledge check (before training);
                                <span className="text-cyan-400"> Post-Assessment</span> = AI-graded scenario-based evaluation (after training). Gap indicates training effectiveness.
                            </div>
                        </div>
                        <div className="h-64 w-full relative">
                            {isLoading ? (
                                <div className="absolute inset-0 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div></div>
                            ) : (analytics?.preVsPostAssessment?.length || 0) > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={analytics?.preVsPostAssessment || []}
                                        onClick={handleImpactClick}
                                        className="cursor-pointer"
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.5} />
                                        <XAxis dataKey="curriculum" stroke="#666" tick={{ fontSize: 10 }} />
                                        <YAxis stroke="#666" tick={{ fontSize: 10 }} domain={[0, 100]} />
                                        <Tooltip
                                            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                                            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333', borderRadius: '8px', backdropFilter: 'blur(4px)' }}
                                            labelStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                            itemStyle={{ color: '#fff', fontSize: '11px' }}
                                            formatter={(value: number, name: string) => [
                                                `${value}%`,
                                                name === 'preScore' ? 'Pre-Assessment' : name === 'postScore' ? 'Post-Assessment' : 'Score'
                                            ]}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                                        <Line type="monotone" dataKey="preScore" stroke="#a855f7" strokeWidth={2} name="Pre-Assessment" dot={{ r: 4, cursor: 'pointer' }} activeDot={{ r: 6 }} />
                                        <Line type="monotone" dataKey="postScore" stroke="#06b6d4" strokeWidth={2} name="Post-Assessment" dot={{ r: 4, cursor: 'pointer' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center theme-text-primary/40 text-sm border-2 border-dashed border-white/5 rounded">
                                    No assessment data available
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Heatmap Row */}
                <div className="grid grid-cols-1 gap-6">
                    <div className="theme-bg-secondary border theme-border rounded-lg p-6 bg-opacity-50 backdrop-blur-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                            <h3 className="text-sm font-bold theme-text-primary flex items-center gap-2">
                                <LayoutGrid size={16} className="text-orange-500" />
                                SKILL_ADOPTION_MATRIX (HEATMAP)
                            </h3>
                            <div className="flex items-center gap-4 text-[10px] md:text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 md:w-3 md:h-3 bg-amber-100"></div>
                                    <span className="theme-text-secondary">&lt;30%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 md:w-3 md:h-3 bg-orange-400"></div>
                                    <span className="theme-text-secondary">30-70%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 md:w-3 md:h-3 bg-red-700"></div>
                                    <span className="theme-text-primary">&gt;70%</span>
                                </div>
                            </div>
                        </div>
                        {/* Methodology Note */}
                        <div className="mb-4 p-3 rounded-lg bg-black/10 dark:bg-white/5 border border-dashed theme-border">
                            <p className="text-[10px] theme-text-secondary leading-relaxed mb-2">
                                <strong className="theme-text-primary">📊 Skill Adoption Methodology:</strong> Values show <strong>Adoption Rate</strong> = % of employees considered "Expert" per skill per department.
                            </p>
                            <ul className="text-[10px] theme-text-secondary/80 list-disc list-inside space-y-1">
                                <li>An employee is classified as an <strong className="text-cyan-500 dark:text-cyan-400">Expert</strong> if they meet <strong>ANY</strong> of these criteria:</li>
                                <li className="ml-4">✓ <strong>Assessment Score ≥70%</strong> – Passing grade on skill-specific assessments</li>
                                <li className="ml-4">✓ <strong>Related Certification</strong> – Holds a relevant professional certification (e.g., AWS Cert for Cloud skills)</li>
                                <li className="ml-4">✓ <strong>Skill Badge</strong> – Has an internal badge recognizing expertise</li>
                            </ul>
                            <p className="text-[9px] theme-text-secondary/60 mt-2 italic">
                                💡 Formula: Adoption Rate = (# of Experts in Dept) ÷ (# of Employees who took the skill assessment in Dept)
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            {isLoading ? (
                                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div></div>
                            ) : analytics?.skillHeatmap && analytics.skillHeatmap.length > 0 ? (
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
                                                            <td key={colIndex} className="p-1 text-center">
                                                                <div
                                                                    className={`w-full py-2 flex items-center justify-center rounded transition-all ${bgColor} ${textColor} font-bold text-[10px] shadow-sm`}
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
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Operative Performance Log */}
                <div className="theme-bg-secondary border theme-border rounded-lg overflow-hidden bg-opacity-50 backdrop-blur-sm flex flex-col">
                    <div className="p-4 border-b theme-border bg-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Trophy size={16} className="text-yellow-500" />
                            <h3 className="text-sm font-bold theme-text-primary">OPERATIVE_PERFORMANCE_LOG</h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-grow sm:flex-grow-0">
                                <input
                                    type="text"
                                    placeholder="Search operative..."
                                    className="bg-black/20 border theme-border rounded px-3 py-1.5 pl-8 text-xs theme-text-primary w-full sm:w-48 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                />
                                <Search size={12} className="absolute left-2.5 top-2 data-[dirty=true]:text-cyan-400 text-gray-500" />
                            </div>

                            <ColumnToggle
                                columns={TABLE_COLUMNS}
                                visibleColumns={visibleColumns}
                                onToggle={handleColumnToggle}
                            />

                            <button
                                onClick={handleExportCsv}
                                className="flex items-center gap-2 px-3 py-1.5 border theme-border rounded hover:bg-white/5 theme-text-secondary transition-colors text-xs"
                                title="Export CSV"
                            >
                                <Download size={12} />
                                <span className="hidden sm:inline">CSV</span>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-black/5 dark:bg-black/40 theme-text-secondary uppercase font-mono">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Operative</th>
                                    {visibleColumns.has('role') && <th className="px-6 py-3 font-medium">Role</th>}
                                    {visibleColumns.has('department') && <th className="px-6 py-3 font-medium">Department</th>}
                                    {visibleColumns.has('status') && <th className="px-6 py-3 font-medium">Status</th>}
                                    {visibleColumns.has('goal') && <th className="px-6 py-3 font-medium">Goal Set</th>}
                                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                {paginatedEmployees.length > 0 ? paginatedEmployees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 font-medium theme-text-primary group-hover:text-cyan-400 transition-colors">
                                            {emp.name}
                                        </td>
                                        {visibleColumns.has('role') && <td className="px-6 py-4 theme-text-secondary">{emp.role}</td>}
                                        {visibleColumns.has('department') && <td className="px-6 py-4 theme-text-secondary">{emp.department}</td>}
                                        {visibleColumns.has('status') && (
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] border ${emp.status === 'Active'
                                                    ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'
                                                    : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 theme-text-secondary'
                                                    }`}>
                                                    {emp.status ? emp.status.toUpperCase() : 'ACTIVE'}
                                                </span>
                                            </td>
                                        )}
                                        {visibleColumns.has('goal') && (
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] border ${emp.hasGoal
                                                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400'
                                                    : 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400'
                                                    }`}>
                                                    {emp.hasGoal ? 'YES' : 'NO'}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleViewEmployee(emp.id)}
                                                className="theme-text-secondary hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors font-mono text-[10px] border theme-border px-2 py-1 rounded hover:border-cyan-500/30"
                                            >
                                                REVIEW
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center theme-text-secondary italic">
                                            No operatives found matching "{searchTerm}"
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="p-4 border-t theme-border flex items-center justify-between text-xs theme-text-secondary">
                        <span className="font-mono">
                            Showing {paginatedEmployees.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredEmployees.length)} of {filteredEmployees.length} operatives
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border theme-border rounded hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                PREV
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Simple logic to show first few pages, ideally improved for many pages
                                let pageNum = i + 1;
                                if (totalPages > 5 && currentPage > 3) {
                                    pageNum = currentPage - 2 + i;
                                }
                                if (pageNum > totalPages) return null;

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${currentPage === pageNum
                                            ? 'bg-cyan-500 text-white font-bold'
                                            : 'hover:bg-white/5 border theme-border'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="px-3 py-1 border theme-border rounded hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                NEXT
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <EmployeeDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                employee={selectedEmployee}
            />

            <TrainingImpactModal
                isOpen={impactModalOpen}
                onClose={() => setImpactModalOpen(false)}
                curriculumId={selectedImpactCurriculum?.id || ''}
                curriculumName={selectedImpactCurriculum?.name || ''}
            />
        </div>
    );
};