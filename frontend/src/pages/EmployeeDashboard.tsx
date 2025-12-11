import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Terminal, Cpu, Activity, LogOut, User, Trophy, Sun, Moon, Sparkles, Brain } from 'lucide-react';
import { ChallengeCard } from '../components/ChallengeCard';
import { ChallengeModal } from '../components/ChallengeModal';
import { PreAssessmentModal } from '../components/PreAssessmentModal';
import { PostAssessmentModal } from '../components/PostAssessmentModal';
import { CareerPath } from '../components/CareerPath';
import { PersonalizedAssessmentModal } from '../components/PersonalizedAssessmentModal';
import { API_BASE_URL } from '../config';
import { fetchWithRetry } from '../utils/fetchWithRetry';

// Interface for profile stats fetched from API
interface ProfileStats {
    eloRating: number;
    completedMissions: number;
    totalAssessments: number;
    totalScore: number;
    jobTitle: string;
}

export const EmployeeDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const { toggleTheme, isDark } = useTheme();
    const navigate = useNavigate();

    // State
    const [mainChallenges, setMainChallenges] = useState<any[]>([]);
    const [selectedChallenge, setSelectedChallenge] = useState<any | null>(null);


    // Modals state
    const [showPreAssessment, setShowPreAssessment] = useState(false);
    const [showPostAssessment, setShowPostAssessment] = useState(false);
    const [showPersonalizedAssessment, setShowPersonalizedAssessment] = useState(false);

    const [preAssessmentScenario, setPreAssessmentScenario] = useState<any | null>(null);
    const [postAssessmentScenario, setPostAssessmentScenario] = useState<any | null>(null);
    const [preAssessmentStatuses, setPreAssessmentStatuses] = useState<Record<string, boolean>>({});
    const [postAssessmentStatuses, setPostAssessmentStatuses] = useState<Record<string, boolean>>({});

    // New state for fresh profile stats (fetched directly from API with retry)
    const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Fetch fresh profile stats from /api/employees/profile with retry logic
    const fetchProfileStats = async () => {
        if (!user?.id) return;
        try {
            const token = localStorage.getItem('token');
            console.log('[EmployeeDashboard] Fetching profile stats with retry...');
            const response = await fetchWithRetry(`${API_BASE_URL}/api/employees/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            console.log('[EmployeeDashboard] Profile stats response:', data);
            if (data.success && data.profile) {
                setProfileStats({
                    eloRating: data.profile.elo_rating || 1000,
                    completedMissions: data.profile.stats?.completedMissions || 0,
                    totalAssessments: data.profile.stats?.totalAssessments || 0,
                    totalScore: data.profile.stats?.totalScore || 0,
                    jobTitle: data.profile.job_title || 'Employee'
                });
            }
        } catch (err) {
            console.error('[EmployeeDashboard] Error fetching profile stats:', err);
        }
    };

    const fetchChallenges = async () => {
        try {
            // Fetch Main Challenges - now filtered by department via userId
            console.log('[EmployeeDashboard] Fetching challenges with retry...');
            const mainRes = await fetchWithRetry(`${API_BASE_URL}/api/challenges/main${user?.id ? `?userId=${user.id}` : ''}`);
            const mainData = await mainRes.json();
            console.log('[EmployeeDashboard] Received', mainData.data?.length, 'main challenges');
            if (mainData.success) setMainChallenges(mainData.data);
        } catch (error) {
            console.error('[EmployeeDashboard] Failed to fetch challenges:', error);
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

    // Fetch all assessment statuses for all challenges with retry logic
    const fetchAllAssessmentStatuses = async (challenges: any[]) => {
        if (!user?.id || challenges.length === 0) return;

        console.log('[EmployeeDashboard] Fetching assessment statuses with retry...');
        const preStatuses: Record<string, boolean> = {};
        const postStatuses: Record<string, boolean> = {};

        for (const challenge of challenges) {
            try {
                // Check pre-assessment status with retry
                const preRes = await fetchWithRetry(`${API_BASE_URL}/api/assessments/pre-assessment/status/${user.id}/${challenge.id}`);
                const preData = await preRes.json();
                preStatuses[challenge.id] = preData.completed || false;

                // Check post-assessment status (completed post-assessments) with retry
                const postRes = await fetchWithRetry(`${API_BASE_URL}/api/assessments/post-assessment/status/${user.id}/${challenge.id}`);
                const postData = await postRes.json();
                postStatuses[challenge.id] = postData.completed || false;
            } catch (error) {
                console.error('[EmployeeDashboard] Failed to check status for challenge', challenge.id, error);
                preStatuses[challenge.id] = false;
                postStatuses[challenge.id] = false;
            }
        }

        console.log('[EmployeeDashboard] Assessment statuses fetched:', { preStatuses, postStatuses });
        setPreAssessmentStatuses(preStatuses);
        setPostAssessmentStatuses(postStatuses);
    };

    useEffect(() => {
        const loadData = async () => {
            // Fetch profile stats first to get accurate ELO and completion counts
            await fetchProfileStats();
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

            <div className="max-w-7xl mx-auto p-6 space-y-12">
                {/* 1. Header & Stats Row */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-widest theme-text-primary">
                                WELCOME BACK, <span className="text-cyan-600 dark:text-cyan-400">{user?.name?.split(' ')[0].toUpperCase()}</span>
                            </h1>
                            <p className="theme-text-secondary text-sm mt-1">Ready for your next mission?</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="theme-bg-secondary border theme-border rounded-lg p-4 text-center hover:border-cyan-500/30 transition-colors">
                            <p className="text-[10px] theme-text-muted uppercase tracking-wider mb-1">ELO Rating</p>
                            <p className="text-2xl font-bold text-cyan-400">{profileStats?.eloRating || 1000}</p>
                        </div>
                        <div className="theme-bg-secondary border theme-border rounded-lg p-4 text-center hover:border-green-500/30 transition-colors">
                            <p className="text-[10px] theme-text-muted uppercase tracking-wider mb-1">Missions Completed</p>
                            <p className="text-2xl font-bold text-green-400">{Object.values(postAssessmentStatuses).filter(Boolean).length}</p>
                        </div>
                        <div className="theme-bg-secondary border theme-border rounded-lg p-4 text-center hover:border-yellow-500/30 transition-colors">
                            <p className="text-[10px] theme-text-muted uppercase tracking-wider mb-1">In Progress</p>
                            <p className="text-2xl font-bold text-yellow-400">{mainChallenges.filter(c => preAssessmentStatuses[c.id] && !postAssessmentStatuses[c.id]).length}</p>
                        </div>
                        <div className="theme-bg-secondary border theme-border rounded-lg p-4 text-center hover:border-purple-500/30 transition-colors">
                            <p className="text-[10px] theme-text-muted uppercase tracking-wider mb-1">Rank</p>
                            {/* Placeholder rank, could be fetched if available */}
                            <p className="text-2xl font-bold text-purple-400">#{profileStats?.eloRating ? (profileStats.eloRating > 1200 ? '12' : '45') : '--'}</p>
                        </div>
                    </div>
                </div>

                {/* 2. Career Goal (Hero Section) */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded border border-cyan-500/30">
                            <Sparkles size={16} className="text-cyan-400" />
                        </div>
                        <h2 className="text-lg font-bold theme-text-primary tracking-wider">CAREER OBJECTIVE</h2>
                    </div>

                    <div className="theme-bg-secondary border theme-border rounded-xl p-1">
                        <CareerPath userId={user?.id} />
                    </div>
                </div>

                {/* 3. Challenges Section */}
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b theme-border pb-4">
                        <h2 className="text-xl font-bold theme-text-primary tracking-wider flex items-center gap-2">
                            <span className="text-cyan-600 dark:text-cyan-400">&gt;_</span> ACTIVE MISSIONS
                        </h2>

                        <button
                            onClick={() => setShowPersonalizedAssessment(true)}
                            className="group relative inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:shadow-cyan-500/25 hover:scale-105 transition-all duration-300 text-sm"
                        >
                            <div className="absolute inset-0 bg-white/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <Brain className="animate-pulse" size={16} />
                            <span>New Assessment</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {/* In Progress First */}
                        {mainChallenges
                            .filter(c => preAssessmentStatuses[c.id] && !postAssessmentStatuses[c.id])
                            .map(challenge => (
                                <div key={challenge.id} className="relative">
                                    <div className="absolute -top-3 -right-2 z-10">
                                        <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-yellow-400 animate-bounce">
                                            IN PROGRESS
                                        </span>
                                    </div>
                                    <ChallengeCard
                                        challenge={challenge}
                                        onClick={() => handleChallengeClick(challenge)}
                                        preAssessmentCompleted={preAssessmentStatuses[challenge.id]}
                                        postAssessmentCompleted={postAssessmentStatuses[challenge.id]}
                                    />
                                </div>
                            ))}

                        {/* Then Available */}
                        {mainChallenges
                            .filter(c => !preAssessmentStatuses[c.id])
                            .map(challenge => (
                                <ChallengeCard
                                    key={challenge.id}
                                    challenge={challenge}
                                    onClick={() => handleChallengeClick(challenge)}
                                    preAssessmentCompleted={preAssessmentStatuses[challenge.id]}
                                    postAssessmentCompleted={postAssessmentStatuses[challenge.id]}
                                />
                            ))}

                        {/* Then Completed (faded/at the end) */}
                        {mainChallenges
                            .filter(c => postAssessmentStatuses[c.id])
                            .map(challenge => (
                                <div key={challenge.id} className="opacity-60 hover:opacity-100 transition-opacity">
                                    <ChallengeCard
                                        challenge={challenge}
                                        onClick={() => handleChallengeClick(challenge)}
                                        preAssessmentCompleted={preAssessmentStatuses[challenge.id]}
                                        postAssessmentCompleted={postAssessmentStatuses[challenge.id]}
                                    />
                                </div>
                            ))}

                        {mainChallenges.length === 0 && (
                            <div className="col-span-full text-center py-12 theme-text-muted text-sm border theme-border border-dashed rounded-lg">
                                <Activity size={32} className="mx-auto mb-3 opacity-20" />
                                <p>No missions available at this time.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modals */}
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
                            fetchChallenges();
                        }}
                    />
                )}

                {showPersonalizedAssessment && user?.id && (
                    <PersonalizedAssessmentModal
                        userId={user.id}
                        userJobTitle={profileStats?.jobTitle || ''}
                        onClose={() => setShowPersonalizedAssessment(false)}
                        onComplete={(score, skills) => {
                            console.log('Assessment completed', score, skills);
                            fetchProfileStats();
                            // Possibly fetch challenges again if the assessment generated one?
                            fetchChallenges();
                            setShowPersonalizedAssessment(false);
                        }}
                    />
                )}
            </div>
        </div>
    );
};