import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Terminal, Shield, Target, Cpu, Database, Lock, Activity, LogOut, User, Briefcase, CheckCircle, AlertTriangle, Lightbulb, Sparkles, X, Loader, Award, Code, Network, Brain, Ghost, TrendingUp, Zap } from 'lucide-react';
import { API_BASE_URL, getRankFromElo } from '../config';
import { CertificationManager } from '../components/CertificationManager';
import { SkillManager } from '../components/SkillManager';
import { fetchWithRetry } from '../utils/fetchWithRetry';

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

interface AssessmentFeedback {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
}

interface SelfAssessmentPlan {
    title: string;
    overview: string;
    steps: { step: number; title: string; description: string; timeEstimate: string }[];
    resources: string[];
    practiceExercises: string[];
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
    assessmentFeedback?: AssessmentFeedback;
}

// Helper Component for Rank Badge
const RankBadge = ({ elo }: { elo: number }) => {
    const rank = getRankFromElo(elo);

    // Map badgeId to Lucide Icons
    const getIcon = () => {
        switch (rank.badgeId) {
            case 'initiate': return <Shield size={24} />;
            case 'scout': return <Target size={24} />;
            case 'recruit': return <Award size={24} />;
            case 'agent': return <Briefcase size={24} />;
            case 'operative': return <Terminal size={24} />;
            case 'specialist': return <Cpu size={24} />;
            case 'hacker': return <Code size={24} />;
            case 'architect': return <Network size={24} />;
            case 'mastermind': return <Brain size={24} />;
            case 'ghost': return <Ghost size={24} />;
            default: return <Shield size={24} />;
        }
    };

    return (
        <div className={`flex items-center gap-3 px-4 py-2 rounded-full border bg-opacity-10 ${rank.color.replace('text-', 'bg-')} ${rank.color.replace('text-', 'border-')}`}>
            <div className={`${rank.color} ${rank.badgeId === 'ghost' ? 'animate-pulse' : ''}`}>
                {getIcon()}
            </div>
            <div className="flex flex-col">
                <span className={`text-sm font-bold uppercase tracking-wider ${rank.color}`}>
                    {rank.title}
                </span>
                <span className="text-sm font-mono text-cyan-400 font-bold">
                    {elo} ELO
                </span>
            </div>
        </div>
    );
};

export const Profile: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSelfAssessmentModal, setShowSelfAssessmentModal] = useState(false);
    const [selectedWeakness, setSelectedWeakness] = useState<string | null>(null);
    const [selfAssessmentPlan, setSelfAssessmentPlan] = useState<SelfAssessmentPlan | null>(null);
    const [generatingPlan, setGeneratingPlan] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleGenerateSelfAssessment = async (weakness: string) => {
        setSelectedWeakness(weakness);
        setShowSelfAssessmentModal(true);
        setGeneratingPlan(true);
        setSelfAssessmentPlan(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/assessments/self-assessment/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id, weakness })
            });
            const data = await response.json();
            console.log('Self-assessment plan:', data);
            if (data.success) {
                setSelfAssessmentPlan(data.plan);
            }
        } catch (err) {
            console.error('Error generating self-assessment:', err);
        } finally {
            setGeneratingPlan(false);
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                setError(null);
                const token = localStorage.getItem('token');
                console.log('[Profile] Fetching profile with retry...');
                const response = await fetchWithRetry(`${API_BASE_URL}/api/employees/profile`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                console.log('[Profile] Profile data:', data);

                if (data.success) {
                    setProfile(data.profile);
                } else {
                    setError(data.message || 'Failed to load profile');
                }
            } catch (err) {
                console.error('[Profile] Error fetching profile:', err);
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
            <div className="min-h-screen theme-bg-primary text-cyan-50 font-mono flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen theme-bg-primary text-cyan-50 font-mono selection:bg-cyan-500/30">
            {/* Top Navigation Bar Mimic */}
            <div className="border-b theme-border theme-bg-nav backdrop-blur-md px-6 py-3 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-2 text-sm font-bold tracking-wider theme-text-secondary">
                    <Terminal size={16} />
                    <span>GenAI CTF Academy</span>
                </div>
                <div className="flex items-center gap-4 text-xs theme-text-secondary">
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
                        <h1 className="text-2xl font-bold tracking-widest theme-text-primary">OPERATIVE STATUS:</h1>
                        <span className="text-2xl font-bold text-green-500 animate-pulse">ACTIVE</span>
                    </div>
                    <p className="theme-text-secondary max-w-2xl">
                        Welcome to the GenAI CTF Academy, {profile?.name || user?.name || 'Operative'}. Select a module to begin training.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Profile Info Card */}
                <div className="theme-bg-secondary border border-white/5 rounded-lg p-6">
                    <div className="flex items-start gap-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-3xl font-bold">
                            {(profile?.name || user?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold theme-text-primary">{profile?.name || user?.name}</h2>
                            <div className="flex items-center gap-4 mt-2 text-sm theme-text-secondary">
                                <div className="flex items-center gap-1">
                                    <Briefcase size={14} />
                                    <span>{profile?.job_title || 'Employee'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <User size={14} />
                                    <span>{profile?.department || 'Unassigned'}</span>
                                </div>
                            </div>

                            {/* Updated Rank Display */}
                            <div className="flex items-center gap-4 mt-3">
                                <RankBadge elo={profile?.elo_rating || 1000} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Total Score */}
                    <div className="theme-bg-secondary border border-white/5 rounded-lg p-6 relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Target size={64} />
                        </div>
                        <p className="text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1">Total Score</p>
                        <p className="text-4xl font-bold theme-text-primary font-mono">{profile?.stats.totalScore || 0}</p>
                    </div>

                    {/* Missions Complete */}
                    <div className="theme-bg-secondary border border-white/5 rounded-lg p-6 relative overflow-hidden group hover:border-green-500/30 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Shield size={64} />
                        </div>
                        <p className="text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1">Missions Complete</p>
                        <p className="text-4xl font-bold theme-text-primary font-mono">{profile?.stats.completedMissions || 0}</p>
                    </div>

                    {/* Total Assessments */}
                    <div className="theme-bg-secondary border border-white/5 rounded-lg p-6 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Activity size={64} />
                        </div>
                        <p className="text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1">Total Assessed</p>
                        <p className="text-4xl font-bold theme-text-primary font-mono">{profile?.stats.totalAssessments || 0}</p>
                    </div>

                    {/* Rank */}
                    <div className="theme-bg-secondary border border-white/5 rounded-lg p-6 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Lock size={64} />
                        </div>
                        <p className="text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1">Rank</p>
                        <p className="text-4xl font-bold theme-text-primary font-mono">{profile?.rankTitle || 'RECRUIT'}</p>
                    </div>
                </div>

                {/* Assessment Feedback Section */}
                {profile?.assessmentFeedback && (profile.assessmentFeedback.strengths.length > 0 || profile.assessmentFeedback.weaknesses.length > 0 || profile.assessmentFeedback.recommendations.length > 0) && (
                    <div className="theme-bg-secondary border border-white/5 rounded-lg p-6">
                        <h2 className="text-lg font-bold theme-text-primary tracking-wider mb-6 flex items-center gap-2">
                            <Target size={18} className="text-cyan-400" />
                            ASSESSMENT FEEDBACK
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Strengths */}
                            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                                <h3 className="text-sm font-bold text-green-400 flex items-center gap-2 mb-3">
                                    <CheckCircle size={16} />
                                    STRENGTHS
                                </h3>
                                <ul className="space-y-2">
                                    {profile.assessmentFeedback.strengths.length > 0 ? (
                                        profile.assessmentFeedback.strengths.map((strength, idx) => (
                                            <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                                                <span className="text-green-400 mt-1">•</span>
                                                {strength}
                                            </li>
                                        ))
                                    ) : (
                                        <li className="text-sm text-gray-500">Complete assessments to identify strengths</li>
                                    )}
                                </ul>
                            </div>

                            {/* Weaknesses */}
                            <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4">
                                <h3 className="text-sm font-bold text-orange-400 flex items-center gap-2 mb-3">
                                    <AlertTriangle size={16} />
                                    AREAS TO IMPROVE
                                </h3>
                                <ul className="space-y-2">
                                    {profile.assessmentFeedback.weaknesses.length > 0 ? (
                                        profile.assessmentFeedback.weaknesses.map((weakness, idx) => (
                                            <li key={idx} className="text-sm text-gray-300 flex items-start gap-2 group">
                                                <span className="text-orange-400 mt-1">•</span>
                                                <span className="flex-1">{weakness}</span>
                                                <button
                                                    onClick={() => handleGenerateSelfAssessment(weakness)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded hover:bg-orange-500/30"
                                                    title="Generate improvement plan"
                                                >
                                                    <Sparkles size={12} />
                                                </button>
                                            </li>
                                        ))
                                    ) : (
                                        <li className="text-sm text-gray-500">No weaknesses identified yet</li>
                                    )}
                                </ul>
                            </div>

                            {/* Recommendations */}
                            <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">
                                <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2 mb-3">
                                    <Lightbulb size={16} />
                                    RECOMMENDATIONS
                                </h3>
                                <ul className="space-y-2">
                                    {profile.assessmentFeedback.recommendations.length > 0 ? (
                                        profile.assessmentFeedback.recommendations.map((rec, idx) => (
                                            <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                                                <span className="text-purple-400 mt-1">•</span>
                                                {rec}
                                            </li>
                                        ))
                                    ) : (
                                        <li className="text-sm text-gray-500">Complete assessments for recommendations</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Skill Matrix */}
                    <div className="theme-bg-secondary border border-white/5 rounded-lg p-6">
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
                    <div className="theme-bg-secondary border border-white/5 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-green-400 tracking-wider flex items-center gap-2">
                                <Database size={18} />
                                AVAILABLE MODULES
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {modules.length > 0 ? (
                                modules.map((module, idx) => (
                                    <div key={idx} className="bg-white dark:bg-black/40 border border-gray-200 dark:border-white/5 p-4 rounded flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group shadow-sm">
                                        <div className="space-y-2 flex-1 mr-4">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-bold theme-text-primary group-hover:text-cyan-500 transition-colors">{module.name}</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="theme-bg-secondary border border-white/5 rounded-lg p-6">
                        <h2 className="text-lg font-bold text-amber-400 tracking-wider mb-6 flex items-center gap-2">
                            <TrendingUp size={18} />
                            PERFORMANCE STATS
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white dark:bg-black/40 border border-emerald-200 dark:border-emerald-500/20 rounded-lg group hover:border-emerald-500/50 transition-colors shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs theme-text-secondary uppercase tracking-wider">Win Rate</p>
                                    <Activity size={14} className="text-emerald-500" />
                                </div>
                                <p className="text-2xl font-bold text-emerald-400">{profile?.win_rate || 0}%</p>
                            </div>
                            <div className="p-4 bg-white dark:bg-black/40 border border-orange-200 dark:border-orange-500/20 rounded-lg group hover:border-orange-500/50 transition-colors shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs theme-text-secondary uppercase tracking-wider">Streak</p>
                                    <Zap size={14} className="text-orange-500" />
                                </div>
                                <p className="text-2xl font-bold text-orange-400">{profile?.streak || 0}</p>
                            </div>
                            <div className="p-4 bg-white dark:bg-black/40 border border-purple-200 dark:border-purple-500/20 rounded-lg group hover:border-purple-500/50 transition-colors shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs theme-text-secondary uppercase tracking-wider">Avg Score</p>
                                    <Target size={14} className="text-purple-500" />
                                </div>
                                <p className="text-2xl font-bold text-purple-400">{profile?.stats.averageScore || 0}%</p>
                            </div>
                            <div className="p-4 bg-white dark:bg-black/40 border border-cyan-200 dark:border-cyan-500/20 rounded-lg group hover:border-cyan-500/50 transition-colors shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs theme-text-secondary uppercase tracking-wider">Rank</p>
                                    <Award size={14} className="text-cyan-500" />
                                </div>
                                <p className="text-2xl font-bold text-cyan-400">#{profile?.ranking || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Certifications Section Wrapper to align grid */}
                    <div className="theme-bg-secondary border border-white/5 rounded-lg p-6">
                        <CertificationManager userId={user?.id} />
                    </div>
                </div>

                {/* Skills Section - Full Width */}
                <div className="theme-bg-secondary border border-white/5 rounded-lg p-6">
                    <SkillManager />
                </div>


            </div>


            {/* Self-Assessment Modal */}
            {showSelfAssessmentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="theme-bg-secondary border theme-border rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b theme-border">
                            <h2 className="text-lg font-bold theme-text-primary flex items-center gap-2">
                                <Sparkles size={18} className="text-orange-400" />
                                Self-Improvement Plan
                            </h2>
                            <button
                                onClick={() => setShowSelfAssessmentModal(false)}
                                className="text-gray-400 hover:theme-text-primary transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {generatingPlan ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader size={32} className="text-orange-400 animate-spin mb-4" />
                                    <p className="text-gray-400">Generating your personalized improvement plan...</p>
                                    <p className="text-gray-500 text-sm mt-2">Analyzing: "{selectedWeakness}"</p>
                                </div>
                            ) : selfAssessmentPlan ? (
                                <>
                                    {/* Plan Title & Overview */}
                                    <div>
                                        <h3 className="text-xl font-bold theme-text-primary mb-2">{selfAssessmentPlan.title}</h3>
                                        <p className="text-gray-400">{selfAssessmentPlan.overview}</p>
                                    </div>

                                    {/* Steps */}
                                    <div>
                                        <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">Action Steps</h4>
                                        <div className="space-y-3">
                                            {selfAssessmentPlan.steps.map((step, idx) => (
                                                <div key={idx} className="bg-white/5 border theme-border rounded-lg p-4">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-bold flex items-center justify-center">
                                                            {step.step}
                                                        </span>
                                                        <span className="font-bold theme-text-primary flex-1">{step.title}</span>
                                                        <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">{step.timeEstimate}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-400 ml-9">{step.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Resources */}
                                    {selfAssessmentPlan.resources.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-3">Learning Resources</h4>
                                            <ul className="space-y-2">
                                                {selfAssessmentPlan.resources.map((resource, idx) => (
                                                    <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                                                        <span className="text-green-400 mt-1">→</span>
                                                        {resource}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Practice Exercises */}
                                    {selfAssessmentPlan.practiceExercises.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-3">Practice Exercises</h4>
                                            <ul className="space-y-2">
                                                {selfAssessmentPlan.practiceExercises.map((exercise, idx) => (
                                                    <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                                                        <span className="text-purple-400 mt-1">✦</span>
                                                        {exercise}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <p>Failed to generate improvement plan. Please try again.</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-white/10">
                            <button
                                onClick={() => setShowSelfAssessmentModal(false)}
                                className="w-full px-4 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/30 transition-colors font-bold"
                            >
                                GOT IT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};