import React, { useState, useEffect } from 'react';
import { TrendingUp, Lock, CheckCircle, Award, Target, Plus, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { CareerGoalModal } from './CareerGoalModal';
import { CareerRoadmap } from './CareerRoadmap';

interface CareerLevel {
    level: number;
    title: string;
    isCurrent: boolean;
    isCompleted: boolean;
    isLocked: boolean;
    requiredTrainings: string[];
    completedTrainings: string[];
    trainingProgress: number;
    minElo: number;
    meetsElo: boolean;
}

interface CareerData {
    employee: {
        id: string;
        name: string;
        department: string;
        eloRating: number;
        currentLevel: number;
    };
    careerPath: {
        id: string;
        name: string;
        description: string;
    } | null;
    levels: CareerLevel[];
    completedTrainings: string[];
}

interface CareerGoal {
    id: string;
    goal_title: string;
    goal_description: string | null;
    target_timeframe: string;
    generated_roadmap: {
        milestones: { title: string; description: string; timeframe: string; actions: string[] }[];
        skills_to_develop: string[];
    } | null;
    recommended_certifications: string[];
    recommended_assessments: string[];
    status: string;
    created_at: string;
}

interface CareerPathProps {
    userId?: string;
    compact?: boolean;
}

export const CareerPath: React.FC<CareerPathProps> = ({
    userId,
    compact = false
}) => {
    const { user } = useAuth();
    const [careerData, setCareerData] = useState<CareerData | null>(null);
    const [careerGoals, setCareerGoals] = useState<CareerGoal[]>([]);
    const [loading, setLoading] = useState(true);
    const [goalsLoading, setGoalsLoading] = useState(true);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'goals' | 'path'>('goals');

    const targetUserId = userId || user?.id;

    useEffect(() => {
        fetchCareerProgress();
        fetchCareerGoals();
    }, [targetUserId]);

    const fetchCareerProgress = async () => {
        if (!targetUserId) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/career/progress/${targetUserId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.success) {
                setCareerData(data.data);
            } else {
                // Don't show error for missing career path, it's optional
                console.log('Career progress not available:', data.message);
            }
        } catch (err) {
            console.error('Error fetching career progress:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCareerGoals = async () => {
        if (!targetUserId) return;

        try {
            setGoalsLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/career-goals/${targetUserId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.success) {
                setCareerGoals(data.data || []);
            }
        } catch (err) {
            console.error('Error fetching career goals:', err);
        } finally {
            setGoalsLoading(false);
        }
    };

    const handleGenerateAssessment = async (topic: string) => {
        if (!targetUserId) return;

        console.log('[CareerPath] Generating assessment for:', topic);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/career-goals/generate-assessment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: targetUserId,
                    topic,
                    description: `Self-assessment for career goal: ${topic}`
                })
            });

            const data = await response.json();

            if (data.success) {
                // Navigate to the assessment or show a success message
                alert(`Assessment created! Scenario ID: ${data.data.scenarioId}. Navigate to Challenges to find it, or it will appear in your dashboard.`);
                // Optionally, we could trigger a navigation or modal here
            } else {
                console.error('[CareerPath] Failed to generate assessment:', data.message);
                alert(`Failed to generate assessment: ${data.message}`);
            }
        } catch (err) {
            console.error('[CareerPath] Error generating assessment:', err);
            alert('Error generating assessment. Please try again.');
        }
    };

    // Compact view for sidebar/cards
    if (compact) {
        const activeGoal = careerGoals.find(g => g.status === 'active');
        const currentLevelData = careerData?.levels?.find(l => l.isCurrent);

        return (
            <div className="theme-bg-secondary rounded-lg p-4 border theme-border">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold theme-text-muted uppercase">Career Goal</span>
                    {activeGoal && (
                        <span className="text-xs text-cyan-400">{activeGoal.target_timeframe}</span>
                    )}
                </div>

                {activeGoal ? (
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                            <Target size={20} className="text-white" />
                        </div>
                        <div>
                            <p className="font-bold theme-text-primary">{activeGoal.goal_title}</p>
                            <p className="text-xs theme-text-muted">
                                {activeGoal.generated_roadmap?.milestones?.length || 0} milestones
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-sm theme-text-muted mb-2">No career goal set</p>
                        <button
                            onClick={() => setShowGoalModal(true)}
                            className="text-xs text-cyan-400 hover:underline"
                        >
                            Set your goal →
                        </button>
                    </div>
                )}

                {currentLevelData && careerData?.careerPath && (
                    <div className="bg-black/30 rounded-lg p-3 mt-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs theme-text-muted">{careerData.careerPath.name}</span>
                            <span className="text-xs text-cyan-400">Level {currentLevelData.level}</span>
                        </div>
                        <p className="text-sm font-bold theme-text-primary">{currentLevelData.title}</p>
                    </div>
                )}

                {showGoalModal && targetUserId && (
                    <CareerGoalModal
                        userId={targetUserId}
                        onClose={() => setShowGoalModal(false)}
                        onGoalCreated={fetchCareerGoals}
                    />
                )}
            </div>
        );
    }

    // Full view
    const activeGoal = careerGoals.find(g => g.status === 'active');

    return (
        <div className="space-y-6">
            {/* Header with ELO */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold theme-text-primary flex items-center gap-2">
                        <TrendingUp size={24} className="text-cyan-400" />
                        Career Path
                    </h2>
                    <p className="theme-text-secondary text-sm mt-1">
                        Your progression journey
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs theme-text-muted">Current ELO</p>
                    <p className="text-2xl font-bold text-cyan-400">{careerData?.employee?.eloRating || 1000}</p>
                </div>
            </div>

            {/* Sub-tabs for Goals vs Path */}
            <div className="flex gap-2 p-1 bg-black/30 rounded-lg">
                <button
                    onClick={() => setActiveTab('goals')}
                    className={`flex-1 py-2 px-4 rounded text-sm font-bold transition-all ${activeTab === 'goals'
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Target size={14} className="inline mr-2" />
                    My Career Goal
                </button>
                <button
                    onClick={() => setActiveTab('path')}
                    className={`flex-1 py-2 px-4 rounded text-sm font-bold transition-all ${activeTab === 'path'
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Award size={14} className="inline mr-2" />
                    Career Levels
                </button>
            </div>

            {/* Goals Tab */}
            {activeTab === 'goals' && (
                <div className="space-y-6">
                    {goalsLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : activeGoal ? (
                        <>
                            {/* Active Goal Header */}
                            <div className="theme-bg-secondary border border-cyan-500/30 rounded-lg p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                                            <Target size={28} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold theme-text-primary">{activeGoal.goal_title}</h3>
                                            <p className="text-sm theme-text-secondary">
                                                Target: {activeGoal.target_timeframe}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded-full">
                                        ACTIVE
                                    </span>
                                </div>
                                {activeGoal.goal_description && (
                                    <p className="theme-text-secondary text-sm">{activeGoal.goal_description}</p>
                                )}
                            </div>

                            {/* Roadmap */}
                            {activeGoal.generated_roadmap && (
                                <CareerRoadmap
                                    roadmap={activeGoal.generated_roadmap}
                                    certifications={activeGoal.recommended_certifications}
                                    assessments={activeGoal.recommended_assessments}
                                    onGenerateAssessment={handleGenerateAssessment}
                                />
                            )}
                        </>
                    ) : (
                        /* No goal set - prompt to create one */
                        <div className="theme-bg-secondary border theme-border rounded-lg p-8 text-center">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                                <Sparkles size={40} className="text-cyan-400" />
                            </div>
                            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-3">
                                Where Do You See Yourself in 5 Years?
                            </h3>
                            <p className="theme-text-secondary max-w-md mx-auto mb-6">
                                Set your career aspiration and we'll generate a personalized roadmap
                                with milestones, recommended certifications, and assessments to help you get there.
                            </p>
                            <button
                                onClick={() => setShowGoalModal(true)}
                                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold rounded-lg hover:from-cyan-400 hover:to-purple-500 transition-all flex items-center gap-2 mx-auto"
                            >
                                <Plus size={18} />
                                Set My Career Goal
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Career Levels Tab (existing progression) */}
            {activeTab === 'path' && (
                <>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : careerData?.careerPath ? (
                        <div className="space-y-6">
                            {/* Career Path Name */}
                            <div className="theme-bg-secondary border theme-border rounded-lg p-4">
                                <h3 className="font-bold theme-text-primary">{careerData.careerPath.name}</h3>
                                <p className="text-sm theme-text-secondary">{careerData.careerPath.description}</p>
                            </div>

                            {/* Level Progress Timeline */}
                            <div className="relative">
                                {/* Connection Line */}
                                <div className="absolute left-6 top-12 bottom-12 w-0.5 bg-gray-700"></div>

                                {/* Levels */}
                                <div className="space-y-6">
                                    {careerData.levels.map((level, idx) => (
                                        <div
                                            key={idx}
                                            className={`relative flex items-start gap-4 ${level.isLocked ? 'opacity-50' : ''}`}
                                        >
                                            {/* Level Icon */}
                                            <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${level.isCompleted
                                                ? 'bg-green-500'
                                                : level.isCurrent
                                                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 ring-4 ring-cyan-500/30'
                                                    : 'bg-gray-700'
                                                }`}>
                                                {level.isCompleted ? (
                                                    <CheckCircle size={24} className="text-white" />
                                                ) : level.isLocked ? (
                                                    <Lock size={20} className="text-gray-400" />
                                                ) : (
                                                    <span className="text-lg font-bold text-white">{level.level}</span>
                                                )}
                                            </div>

                                            {/* Level Content */}
                                            <div className={`flex-1 theme-bg-secondary rounded-lg p-4 border ${level.isCurrent ? 'border-cyan-500/50' : 'border-white/5'
                                                }`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <h3 className="font-bold theme-text-primary flex items-center gap-2">
                                                        {level.title}
                                                        {level.isCurrent && (
                                                            <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded">
                                                                CURRENT
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <span className="text-xs theme-text-muted">
                                                        Min ELO: {level.minElo}
                                                        {level.meetsElo && !level.isLocked && (
                                                            <CheckCircle size={12} className="inline ml-1 text-green-400" />
                                                        )}
                                                    </span>
                                                </div>

                                                {/* Required Trainings */}
                                                {level.requiredTrainings.length > 0 && (
                                                    <div className="mt-3">
                                                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                                                            Required Trainings
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {level.requiredTrainings.map((training, tIdx) => {
                                                                const isCompleted = level.completedTrainings.includes(training);
                                                                return (
                                                                    <span
                                                                        key={tIdx}
                                                                        className={`px-2 py-1 text-xs rounded border ${isCompleted
                                                                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                                                            : 'bg-gray-800 border-gray-700 theme-text-muted'
                                                                            }`}
                                                                    >
                                                                        {isCompleted && <CheckCircle size={10} className="inline mr-1" />}
                                                                        {training}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Progress Bar */}
                                                        {!level.isCompleted && level.requiredTrainings.length > 0 && (
                                                            <div className="mt-3">
                                                                <div className="flex justify-between text-xs theme-text-muted mb-1">
                                                                    <span>Progress</span>
                                                                    <span>{level.trainingProgress}%</span>
                                                                </div>
                                                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
                                                                        style={{ width: `${level.trainingProgress}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Completed Trainings Summary */}
                            {careerData.completedTrainings.length > 0 && (
                                <div className="theme-bg-secondary rounded-lg p-4 border theme-border">
                                    <h3 className="text-sm font-bold theme-text-primary mb-3 flex items-center gap-2">
                                        <Award size={16} className="text-yellow-400" />
                                        Completed Trainings ({careerData.completedTrainings.length})
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {careerData.completedTrainings.slice(0, 10).map((training, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 text-xs bg-green-500/10 border border-green-500/30 text-green-400 rounded"
                                            >
                                                <CheckCircle size={10} className="inline mr-1" />
                                                {training}
                                            </span>
                                        ))}
                                        {careerData.completedTrainings.length > 10 && (
                                            <span className="px-2 py-1 text-xs theme-text-muted">
                                                +{careerData.completedTrainings.length - 10} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 theme-text-muted">
                            <Target size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No career level path assigned</p>
                            <p className="text-sm mt-2">Contact your manager to get assigned to a career track.</p>
                        </div>
                    )}
                </>
            )}

            {/* Goal Modal */}
            {showGoalModal && targetUserId && (
                <CareerGoalModal
                    userId={targetUserId}
                    onClose={() => setShowGoalModal(false)}
                    onGoalCreated={fetchCareerGoals}
                />
            )}
        </div>
    );
};
