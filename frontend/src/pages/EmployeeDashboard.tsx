import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Terminal, Cpu, Activity, LogOut, User, Trophy, Sun, Moon, TrendingUp, Award } from 'lucide-react';
import { ChallengeCard } from '../components/ChallengeCard';
import { ChallengeModal } from '../components/ChallengeModal';
import { PreAssessmentModal } from '../components/PreAssessmentModal';
import { PostAssessmentModal } from '../components/PostAssessmentModal';
import { GrowthTab } from '../components/GrowthTab';
import { CareerPath } from '../components/CareerPath';
import { CertificationManager } from '../components/CertificationManager';
import { API_BASE_URL } from '../config';

type DashboardTab = 'challenges' | 'progress' | 'career' | 'growth';

export const EmployeeDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const { toggleTheme, isDark } = useTheme();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<DashboardTab>('challenges');
    const [mainChallenges, setMainChallenges] = useState<any[]>([]);
    const [selectedChallenge, setSelectedChallenge] = useState<any | null>(null);
    const [showPreAssessment, setShowPreAssessment] = useState(false);
    const [showPostAssessment, setShowPostAssessment] = useState(false);
    const [preAssessmentScenario, setPreAssessmentScenario] = useState<any | null>(null);
    const [postAssessmentScenario, setPostAssessmentScenario] = useState<any | null>(null);
    const [preAssessmentStatuses, setPreAssessmentStatuses] = useState<Record<string, boolean>>({});
    const [postAssessmentStatuses, setPostAssessmentStatuses] = useState<Record<string, boolean>>({});
    const [stats] = useState({
        ranking: user?.ranking || 0,
        win_rate: user?.win_rate || 0,
        streak: user?.streak || 0,
        total_assessments: 0
    });

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const fetchChallenges = async () => {
        try {
            // Fetch Main Challenges - now filtered by department via userId
            const mainRes = await fetch(`${API_BASE_URL}/api/challenges/main${user?.id ? `?userId=${user.id}` : ''}`);
            const mainData = await mainRes.json();
            console.log('DEBUG: fetchChallenges - received', mainData.data?.length, 'main challenges');
            if (mainData.success) setMainChallenges(mainData.data);
        } catch (error) {
            console.error('Failed to fetch challenges', error);
        }
    };

    // Check pre-assessment status for a challenge
    const checkPreAssessmentStatus = async (scenarioId: string): Promise<boolean> => {
        if (preAssessmentStatuses[scenarioId] !== undefined) {
            return preAssessmentStatuses[scenarioId];
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/assessments/pre-assessment/status/${user?.id}/${scenarioId}`);
            const data = await res.json();
            setPreAssessmentStatuses(prev => ({ ...prev, [scenarioId]: data.completed || false }));
            return data.completed || false;
        } catch (error) {
            console.error('Failed to check pre-assessment status', error);
            return false;
        }
    };

    // Handle challenge card click - check pre-assessment first
    const handleChallengeClick = async (challenge: any) => {
        console.log('Challenge clicked:', challenge.id);
        const isCompleted = await checkPreAssessmentStatus(challenge.id);

        if (isCompleted) {
            // Pre-assessment completed, open POST-assessment modal
            setPostAssessmentScenario(challenge);
            setShowPostAssessment(true);
        } else {
            // Need to complete pre-assessment first
            setPreAssessmentScenario(challenge);
            setShowPreAssessment(true);
        }
    };

    // Handle pre-assessment completion
    const handlePreAssessmentComplete = (baselineScore: number) => {
        console.log('Pre-assessment completed with score:', baselineScore);
        if (preAssessmentScenario) {
            setPreAssessmentStatuses(prev => ({ ...prev, [preAssessmentScenario.id]: true }));
            setShowPreAssessment(false);
            setPreAssessmentScenario(null);
            // Don't open post-assessment automatically - user will click card again
        }
    };

    // Handle post-assessment completion
    const handlePostAssessmentComplete = (score: number) => {
        console.log('Post-assessment completed with score:', score);
        setShowPostAssessment(false);
        setPostAssessmentScenario(null);
        // Could update challenge card to show "COMPLETED" status
        fetchChallenges(); // Refresh to update UI
    };

    // Fetch all assessment statuses for all challenges
    const fetchAllAssessmentStatuses = async (challenges: any[]) => {
        if (!user?.id || challenges.length === 0) return;

        const preStatuses: Record<string, boolean> = {};
        const postStatuses: Record<string, boolean> = {};

        for (const challenge of challenges) {
            try {
                // Check pre-assessment status
                const preRes = await fetch(`${API_BASE_URL}/api/assessments/pre-assessment/status/${user.id}/${challenge.id}`);
                const preData = await preRes.json();
                preStatuses[challenge.id] = preData.completed || false;

                // Check post-assessment status (completed post-assessments)
                const postRes = await fetch(`${API_BASE_URL}/api/assessments/post-assessment/status/${user.id}/${challenge.id}`);
                const postData = await postRes.json();
                postStatuses[challenge.id] = postData.completed || false;
            } catch (error) {
                console.error('Failed to check status for challenge', challenge.id, error);
                preStatuses[challenge.id] = false;
                postStatuses[challenge.id] = false;
            }
        }

        setPreAssessmentStatuses(preStatuses);
        setPostAssessmentStatuses(postStatuses);
    };

    useEffect(() => {
        const loadData = async () => {
            await fetchChallenges();
        };
        loadData();
    }, [user?.id]);

    // Fetch statuses when challenges are loaded
    useEffect(() => {
        if (mainChallenges.length > 0 && user?.id) {
            fetchAllAssessmentStatuses(mainChallenges);
        }
    }, [mainChallenges, user?.id]);

    return (
        <div className="min-h-screen theme-bg-primary theme-text-primary font-mono selection:bg-cyan-500/30 dark:selection:bg-cyan-500/30">
            {/* Top Navigation Bar */}
            <div className="border-b theme-border theme-bg-nav backdrop-blur-md px-6 py-3 flex justify-between items-center sticky top-0 z-40">
                <div className="flex items-center gap-2 text-sm font-bold tracking-wider theme-text-secondary">
                    <Terminal size={16} />
                    <span>GenAI CTF Academy</span>
                </div>
                <div className="flex items-center gap-4 text-xs theme-text-muted">
                    <div className="flex items-center gap-2">
                        <Cpu size={14} />
                        <span>DEVICE_CONNECTED</span>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>

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
                        className="flex items-center gap-2 px-3 py-1 border border-yellow-500/30 text-yellow-500 dark:text-yellow-400 rounded hover:bg-yellow-500/10 transition-colors"
                    >
                        <Trophy size={14} />
                        LEADERBOARD
                    </button>

                    <button
                        onClick={() => navigate('/profile')}
                        className="flex items-center gap-2 px-3 py-1 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 rounded hover:bg-cyan-500/10 transition-colors"
                    >
                        <User size={14} />
                        MY_PROFILE
                    </button>
                    <button onClick={handleLogout} className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <LogOut size={14} />
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-8">
                {/* Header & Stats */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-widest theme-text-primary">
                            WELCOME BACK, <span className="text-cyan-600 dark:text-cyan-400">{user?.name?.split(' ')[0].toUpperCase()}</span>
                        </h1>
                        <p className="theme-text-secondary text-sm mt-1">Ready for your next mission?</p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 p-1 theme-bg-secondary rounded-lg border theme-border">
                    {[
                        { id: 'challenges' as DashboardTab, label: 'CHALLENGES', icon: Terminal },
                        { id: 'progress' as DashboardTab, label: 'PROGRESS', icon: Activity },
                        { id: 'career' as DashboardTab, label: 'CAREER', icon: TrendingUp },
                        { id: 'growth' as DashboardTab, label: 'GROWTH', icon: Award }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-bold tracking-wider transition-all ${activeTab === tab.id
                                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Icon size={14} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                {activeTab === 'growth' && (
                    <GrowthTab
                        userName={user?.name?.split(' ')[0]}
                        completedTrainings={Object.values(postAssessmentStatuses).filter(Boolean).length}
                        eloRating={(user as any)?.elo_rating || 1000}
                    />
                )}

                {activeTab === 'career' && (
                    <CareerPath userId={user?.id} />
                )}

                {activeTab === 'progress' && (
                    <div className="space-y-6">
                        {/* In Progress Trainings */}
                        <div className="theme-bg-secondary border theme-border rounded-lg p-6">
                            <h2 className="text-lg font-bold theme-text-primary tracking-wider flex items-center gap-2 mb-6">
                                <Activity size={18} className="text-cyan-400" />
                                IN PROGRESS
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {mainChallenges
                                    .filter(c => preAssessmentStatuses[c.id] && !postAssessmentStatuses[c.id])
                                    .map(challenge => (
                                        <ChallengeCard
                                            key={challenge.id}
                                            challenge={challenge}
                                            onClick={() => handleChallengeClick(challenge)}
                                            preAssessmentCompleted={preAssessmentStatuses[challenge.id]}
                                            postAssessmentCompleted={postAssessmentStatuses[challenge.id]}
                                        />
                                    ))}
                                {mainChallenges.filter(c => preAssessmentStatuses[c.id] && !postAssessmentStatuses[c.id]).length === 0 && (
                                    <div className="col-span-full text-center py-8 theme-text-muted text-sm">
                                        No trainings in progress. Start a new challenge!
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Certifications Manager - Full CRUD */}
                        <div className="theme-bg-secondary border theme-border rounded-lg p-6">
                            <CertificationManager userId={user?.id} />
                        </div>
                    </div>
                )}

                {activeTab === 'challenges' && (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                        {/* Left Column: Challenges (3 cols) */}
                        <div className="lg:col-span-3 space-y-8">

                            {/* Main Quests */}
                            <div className="theme-bg-secondary border theme-border rounded-lg p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold theme-text-primary tracking-wider flex items-center gap-2">
                                        <span className="text-cyan-600 dark:text-cyan-400">&gt;_</span> CTF CHALLENGE
                                    </h2>
                                    <button className="px-3 py-1 bg-cyan-100 dark:bg-cyan-900/20 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-bold rounded hover:bg-cyan-200 dark:hover:bg-cyan-900/40 transition-colors">
                                        VIEW ALL
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {mainChallenges.map(challenge => (
                                        <ChallengeCard
                                            key={challenge.id}
                                            challenge={challenge}
                                            onClick={() => handleChallengeClick(challenge)}
                                            preAssessmentCompleted={preAssessmentStatuses[challenge.id]}
                                            postAssessmentCompleted={postAssessmentStatuses[challenge.id]}
                                        />
                                    ))}
                                    {mainChallenges.length === 0 && (
                                        <div className="col-span-full text-center py-8 theme-text-muted text-sm">
                                            No main quests available.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Sidebar (1 col) */}
                        <div className="space-y-6 sticky top-24 self-start">

                            {/* Recent Activity */}
                            <div className="theme-bg-secondary border theme-border rounded-lg p-6">
                                <h2 className="text-sm font-bold theme-text-secondary tracking-wider flex items-center gap-2 mb-6 uppercase">
                                    <Activity size={16} className="text-cyan-600 dark:text-cyan-400" />
                                    Recent Activity
                                </h2>
                                <div className="space-y-6">
                                    {[1, 2, 3].map((_, i) => (
                                        <div key={i} className="flex items-center gap-3 pb-4 border-b theme-border last:pb-0 last:border-0 group">
                                            <div className="w-8 h-8 rounded bg-cyan-100 dark:bg-cyan-900/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold border border-cyan-500/20 text-xs">
                                                AI
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold theme-text-secondary text-xs truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">Completed "Prompt Eng..."</h3>
                                                <p className="text-[10px] theme-text-muted font-mono mt-1">SCORE: 92% • 2H AGO</p>
                                            </div>
                                            <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-bold border border-green-500/20 rounded">PASS</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Stats Summary */}
                            <div className="theme-bg-secondary border theme-border rounded-lg p-6">
                                <h2 className="text-sm font-bold theme-text-secondary tracking-wider mb-4 uppercase">Stats</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 theme-bg-tertiary rounded border theme-border">
                                        <p className="text-[10px] theme-text-muted uppercase">Rank</p>
                                        <p className="text-xl font-bold text-amber-500 dark:text-amber-400">#{stats.ranking || '-'}</p>
                                    </div>
                                    <div className="p-3 theme-bg-tertiary rounded border theme-border">
                                        <p className="text-[10px] theme-text-muted uppercase">Win Rate</p>
                                        <p className="text-xl font-bold text-emerald-500 dark:text-emerald-400">{stats.win_rate}%</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {showPreAssessment && preAssessmentScenario && (
                    <PreAssessmentModal
                        scenario={preAssessmentScenario}
                        onClose={() => {
                            setShowPreAssessment(false);
                            setPreAssessmentScenario(null);
                        }}
                        onComplete={handlePreAssessmentComplete}
                    />
                )}

                {showPostAssessment && postAssessmentScenario && (
                    <PostAssessmentModal
                        scenario={postAssessmentScenario}
                        onClose={() => {
                            setShowPostAssessment(false);
                            setPostAssessmentScenario(null);
                        }}
                        onComplete={handlePostAssessmentComplete}
                    />
                )}

                {selectedChallenge && (
                    <ChallengeModal
                        challenge={selectedChallenge}
                        onClose={() => setSelectedChallenge(null)}
                        onSolve={() => {
                            // Refresh challenges or update state
                            fetchChallenges();
                        }}
                    />
                )}
            </div>
        </div>
    );
};