import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, Trophy, Search, Filter, Download, Plus, LogOut, Shield, Terminal, AlertCircle, Target } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [employees, setEmployees] = React.useState<any[]>([]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    React.useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const response = await import('../api/employee').then(m => m.employeeAPI.getAllEmployees());
                if (response.success) {
                    setEmployees(response.employees);
                }
            } catch (error) {
                console.error('Failed to fetch employees:', error);
            }
        };
        fetchEmployees();
    }, []);

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
                        <button className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-white/10 hover:border-cyan-500/50 text-cyan-400 text-sm rounded transition-all">
                            <Download size={16} />
                            EXPORT_LOGS
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/50 hover:bg-cyan-500/20 text-cyan-400 text-sm rounded transition-all shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                            <Plus size={16} />
                            INVITE_OPERATIVE
                        </button>
                    </div>
                </div>

                {/* Analytics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1 */}
                    <div className="bg-[#111] border border-purple-500/30 p-6 rounded-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users size={64} />
                        </div>
                        <p className="text-purple-400 text-xs font-bold tracking-wider mb-1">ACTIVE OPERATIVES</p>
                        <h3 className="text-4xl font-bold text-white mb-4">1,248</h3>
                        <div className="flex items-center text-xs text-white/60">
                            <span className="text-green-400 flex items-center gap-1 bg-green-400/10 px-1.5 py-0.5 rounded mr-2">
                                <Activity size={10} /> +12%
                            </span>
                            vs last cycle
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-[#111] border border-cyan-500/30 p-6 rounded-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Target size={64} /> {/* Replaced Target with Trophy or similar if needed, but Target works */}
                        </div>
                        <p className="text-cyan-400 text-xs font-bold tracking-wider mb-1">AVG. COMPLETION RATE</p>
                        <h3 className="text-4xl font-bold text-white mb-4">76%</h3>
                        <div className="flex items-center text-xs text-white/60">
                            <span className="text-green-400 flex items-center gap-1 bg-green-400/10 px-1.5 py-0.5 rounded mr-2">
                                <Activity size={10} /> +5%
                            </span>
                            vs last cycle
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-[#111] border border-green-500/30 p-6 rounded-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Trophy size={64} />
                        </div>
                        <p className="text-green-400 text-xs font-bold tracking-wider mb-1">TOTAL ASSESSMENTS</p>
                        <h3 className="text-4xl font-bold text-white mb-4">3,892</h3>
                        <div className="flex items-center text-xs text-white/60">
                            <span className="text-green-400 flex items-center gap-1 bg-green-400/10 px-1.5 py-0.5 rounded mr-2">
                                <Activity size={10} /> +8%
                            </span>
                            vs last cycle
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
                                            <button className="text-white/40 hover:text-cyan-400 transition-colors">EDIT</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
