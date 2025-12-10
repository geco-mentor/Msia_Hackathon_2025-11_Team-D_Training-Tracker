import React from 'react';
import { X, Trophy, Activity, Calendar, Award, TrendingUp, Target } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Assessment {
    id: string;
    score: number;
    feedback: string;
    created_at: string;
    difficulty: string;
    scenario: {
        title: string;
        skill: string;
    };
}

interface EmployeeDetails {
    id: string;
    name: string;
    job_title: string;
    department: string;
    ranking: number;
    win_rate: number;
    streak: number;
    elo_rating?: number;
    assessments: Assessment[];
    analytics?: {
        skillStats: { subject: string; A: number; fullMark: number }[];
        progressData: { date: string; score: number }[];
        preTrainingAvg: number;
        currentAvg: number;
    };
}

interface EmployeeDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: EmployeeDetails | null;
}

export const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({ isOpen, onClose, employee }) => {
    if (!isOpen || !employee) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="theme-bg-secondary border border-white/10 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-start justify-between bg-white/5">
                    <div>
                        <h2 className="text-2xl font-bold theme-text-primary mb-1">{employee.name}</h2>
                        <div className="flex items-center gap-3 text-sm theme-text-primary/60">
                            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10 theme-text-primary/80">
                                {employee.job_title}
                            </span>
                            <span>{employee.department}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors theme-text-primary/60 hover:theme-text-primary"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-black/40 border border-purple-500/20 p-4 rounded-lg">
                            <div className="flex items-center gap-3 mb-2">
                                <Trophy className="text-purple-400" size={20} />
                                <span className="text-sm theme-text-primary/60">Global Ranking</span>
                            </div>
                            <div className="text-2xl font-bold theme-text-primary">#{employee.ranking}</div>
                        </div>
                        <div className="bg-black/40 border border-cyan-500/20 p-4 rounded-lg">
                            <div className="flex items-center gap-3 mb-2">
                                <Activity className="text-cyan-400" size={20} />
                                <span className="text-sm theme-text-primary/60">Win Rate</span>
                            </div>
                            <div className="text-2xl font-bold theme-text-primary">{employee.win_rate}%</div>
                        </div>
                        <div className="bg-black/40 border border-green-500/20 p-4 rounded-lg">
                            <div className="flex items-center gap-3 mb-2">
                                <Award className="text-green-400" size={20} />
                                <span className="text-sm theme-text-primary/60">Current Streak</span>
                            </div>
                            <div className="text-2xl font-bold theme-text-primary">{employee.streak} Days</div>
                        </div>
                        <div className="bg-black/40 border border-yellow-500/20 p-4 rounded-lg">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingUp className="text-yellow-400" size={20} />
                                <span className="text-sm theme-text-primary/60">Elo Rating</span>
                            </div>
                            <div className="text-2xl font-bold theme-text-primary">{employee.elo_rating || 1200}</div>
                        </div>
                    </div>

                    {/* Analytics Section */}
                    {employee.analytics && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Skill Heatmap */}
                            <div className="bg-black/40 border border-white/10 p-6 rounded-lg">
                                <h3 className="text-sm font-bold theme-text-primary mb-6 flex items-center gap-2">
                                    <Target size={16} className="text-purple-400" />
                                    SKILL_PROFICIENCY_HEATMAP
                                </h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={employee.analytics.skillStats}>
                                            <PolarGrid stroke="#333" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                            <Radar
                                                name="Skill Level"
                                                dataKey="A"
                                                stroke="#a855f7"
                                                strokeWidth={2}
                                                fill="#a855f7"
                                                fillOpacity={0.3}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Progress Chart */}
                            <div className="bg-black/40 border border-white/10 p-6 rounded-lg">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-bold theme-text-primary flex items-center gap-2">
                                        <TrendingUp size={16} className="text-cyan-400" />
                                        PROGRESSION_TRACKER
                                    </h3>
                                    <div className="flex gap-4 text-xs">
                                        <div>
                                            <span className="theme-text-primary/40 block">PRE-TRAINING</span>
                                            <span className="theme-text-primary font-mono">{employee.analytics.preTrainingAvg}%</span>
                                        </div>
                                        <div>
                                            <span className="theme-text-primary/40 block">CURRENT</span>
                                            <span className="text-cyan-400 font-mono">{employee.analytics.currentAvg}%</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={employee.analytics.progressData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                            <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 10 }} />
                                            <YAxis domain={[0, 100]} stroke="#666" tick={{ fontSize: 10 }} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="score"
                                                stroke="#06b6d4"
                                                strokeWidth={2}
                                                dot={{ fill: '#06b6d4', r: 4 }}
                                                activeDot={{ r: 6, fill: '#fff' }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent Activity */}
                    <div>
                        <h3 className="text-lg font-bold theme-text-primary mb-4 flex items-center gap-2">
                            <Calendar size={18} className="text-cyan-400" />
                            Recent Activity
                        </h3>
                        <div className="space-y-3">
                            {employee.assessments.length > 0 ? (
                                employee.assessments.map((assessment) => (
                                    <div key={assessment.id} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-cyan-500/30 transition-colors">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h4 className="font-medium theme-text-primary mb-1">{assessment.scenario?.title || 'Untitled Challenge'}</h4>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-cyan-400">{assessment.scenario?.skill}</span>
                                                    <span className="theme-text-primary/40">•</span>
                                                    <span className={`capitalize ${assessment.difficulty === 'Hard' ? 'text-red-400' :
                                                        assessment.difficulty === 'Medium' ? 'text-yellow-400' :
                                                            'text-green-400'
                                                        }`}>{assessment.difficulty}</span>
                                                </div>
                                            </div>
                                            <div className={`text-lg font-bold ${assessment.score >= 80 ? 'text-green-400' :
                                                assessment.score >= 60 ? 'text-yellow-400' :
                                                    'text-red-400'
                                                }`}>
                                                {assessment.score}%
                                            </div>
                                        </div>
                                        {assessment.feedback && (
                                            <div className="mt-3 text-sm text-white/60 bg-black/20 p-3 rounded border border-white/5 font-mono">
                                                {assessment.feedback.split('\n')[0]}...
                                            </div>
                                        )}
                                        <div className="mt-2 text-xs text-white/20 text-right">
                                            {new Date(assessment.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-white/40 border border-dashed border-white/10 rounded-lg">
                                    No recent activity found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
