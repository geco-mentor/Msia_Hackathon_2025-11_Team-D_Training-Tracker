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
import { CareerPath, CareerData } from '../components/CareerPath';
import { API_BASE_URL } from '../config';
import { Zap, Target, Star } from 'lucide-react';

type DashboardTab = 'challenges' | 'progress' | 'career' | 'growth';

export const EmployeeDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const { toggleTheme, isDark } = useTheme();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<DashboardTab>('challenges');
    const [mainChallenges, setMainChallenges] = useState<any[]>([]);
    const [selectedChallenge, setSelectedChallenge] = useState<any | null>(null);
    const [careerData, setCareerData] = useState<CareerData | null>(null);
    const [showPreAssessment, setShowPreAssessment] = useState(false);
    const [showPostAssessment, setShowPostAssessment] = useState(false);
    const [preAssessmentScenario, setPreAssessmentScenario] = useState<any | null>(null);
    const [postAssessmentScenario, setPostAssessmentScenario] = useState<any | null>(null);
    const [preAssessmentStatuses, setPreAssessmentStatuses] = useState<Record<string, boolean>>({});
    const [postAssessmentStatuses, setPostAssessmentStatuses] = useState<Record<string, boolean>>({});

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

    const fetchCareerProgress = async () => {
        if (!user?.id) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/career/progress/${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setCareerData(data.data);
            }
        } catch (err) {
            console.error('Error fetching career progress:', err);
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
            await fetchCareerProgress();
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
                        userId={user?.id}
                    />
                )}

                {activeTab === 'career' && (
                    <CareerPath userId={user?.id} />
                )}

                {activeTab === 'progress' && (
                    <div className="space-y-6">
                        {/* Progress Stats Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="theme-bg-secondary border theme-border rounded-lg p-6 text-center">
                                <p className="text-xs theme-text-muted uppercase tracking-wider mb-1">ELO Rating</p>
                                <p className="text-3xl font-bold text-cyan-400">{(user as any)?.elo_rating || 1000}</p>
                            </div>
                            <div className="theme-bg-secondary border theme-border rounded-lg p-6 text-center">
                                <p className="text-xs theme-text-muted uppercase tracking-wider mb-1">Completed</p>
                                <p className="text-3xl font-bold text-green-400">{Object.values(postAssessmentStatuses).filter(Boolean).length}</p>
                            </div>
                            <div className="theme-bg-secondary border theme-border rounded-lg p-6 text-center">
                                <p className="text-xs theme-text-muted uppercase tracking-wider mb-1">In Progress</p>
                                <p className="text-3xl font-bold text-yellow-400">{mainChallenges.filter(c => preAssessmentStatuses[c.id] && !postAssessmentStatuses[c.id]).length}</p>
                            </div>
                            <div className="theme-bg-secondary border theme-border rounded-lg p-6 text-center">
                                <p className="text-xs theme-text-muted uppercase tracking-wider mb-1">Available</p>
                                <p className="text-3xl font-bold text-purple-400">{mainChallenges.filter(c => !preAssessmentStatuses[c.id]).length}</p>
                            </div>
                        </div>

                        {/* In Progress Trainings */}
                        <div className="theme-bg-secondary border theme-border rounded-lg p-6">
                            <h2 className="text-lg font-bold theme-text-primary tracking-wider flex items-center gap-2 mb-6">
                                <Activity size={18} className="text-yellow-400" />
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

                        {/* Completed Trainings */}
                        <div className="theme-bg-secondary border theme-border rounded-lg p-6">
                            <h2 className="text-lg font-bold theme-text-primary tracking-wider flex items-center gap-2 mb-6">
                                <Award size={18} className="text-green-400" />
                                COMPLETED
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {mainChallenges
                                    .filter(c => postAssessmentStatuses[c.id])
                                    .map(challenge => (
                                        <ChallengeCard
                                            key={challenge.id}
                                            challenge={challenge}
                                            onClick={() => handleChallengeClick(challenge)}
                                            preAssessmentCompleted={preAssessmentStatuses[challenge.id]}
                                            postAssessmentCompleted={postAssessmentStatuses[challenge.id]}
                                        />
                                    ))}
                                {mainChallenges.filter(c => postAssessmentStatuses[c.id]).length === 0 && (
                                    <div className="col-span-full text-center py-8 theme-text-muted text-sm">
                                        No completed trainings yet. Finish a challenge to see it here!
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'challenges' && (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                        {/* Left Column: Challenges (3 cols) */}
                        <div className="lg:col-span-3 space-y-8">

                            {/* Growth Snapshot / Dopamine Hit */}
                            {careerData?.levels?.find(l => l.isCurrent) && (
                                <div className="theme-bg-secondary border theme-border rounded-lg p-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-lg border border-cyan-500/30">
                                                    <Zap size={20} className="text-cyan-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-bold theme-text-muted uppercase tracking-wider">Current Focus</h3>
                                                    <p className="text-xl font-bold theme-text-primary flex items-center gap-2">
                                                        {careerData.levels.find(l => l.isCurrent)?.title}
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                                            Lvl {careerData.levels.find(l => l.isCurrent)?.level}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs theme-text-muted uppercase tracking-wider mb-1">Skill Rating</p>
                                                <div className="flex items-center gap-2 justify-end">
                                                    <Star size={16} className="text-yellow-400 fill-yellow-400" />
                                                    <span className="text-2xl font-bold text-white">{(user as any)?.elo_rating || 1000}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-medium">
                                                <span className="theme-text-secondary">Progress to Next Level</span>
                                                <span className="text-cyan-400">{careerData.levels.find(l => l.isCurrent)?.trainingProgress}%</span>
                                            </div>
                                            <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                                <div
                                                    className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                                                    style={{ width: `${careerData.levels.find(l => l.isCurrent)?.trainingProgress}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center text-xs theme-text-muted mt-2">
                                                <span>{careerData.levels.find(l => l.isCurrent)?.completedTrainings.length} / {careerData.levels.find(l => l.isCurrent)?.requiredTrainings.length} Missions Completed</span>
                                                <span className="flex items-center gap-1 hover:text-cyan-400 cursor-pointer transition-colors" onClick={() => setActiveTab('career')}>
                                                    View Career Path <Target size={12} />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Main Quests */}
                            <div className="theme-bg-secondary border theme-border rounded-lg p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold theme-text-primary tracking-wider flex items-center gap-2">
                                        <span className="text-cyan-600 dark:text-cyan-400">&gt;_</span> CHALLENGE
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
                            {/* Career Quick View */}
                            <CareerPath userId={user?.id} compact={true} />
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