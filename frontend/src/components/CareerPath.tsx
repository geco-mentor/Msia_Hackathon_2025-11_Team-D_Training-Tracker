import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, Target, Plus, Sparkles } from 'lucide-react';

import api from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import { CareerGoalModal } from './CareerGoalModal';
import { CareerRoadmap } from './CareerRoadmap';
import { GrowthTab } from './GrowthTab';

export interface CareerLevel {
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

export interface CareerData {
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
    const [goalsLoading, setGoalsLoading] = useState(true);
    const [showGoalModal, setShowGoalModal] = useState(false);

    const [activeTab, setActiveTab] = useState<'goals' | 'grow'>('grow');
    const [isGenerating, setIsGenerating] = useState(false);


    const targetUserId = userId || user?.id;

    useEffect(() => {
        fetchCareerProgress();
        fetchCareerGoals();
    }, [targetUserId]);

    const fetchCareerProgress = async () => {
        if (!targetUserId) return;

        try {
            const token = localStorage.getItem('token');
            const response = await api.get(`/career/progress/${targetUserId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = response.data;

            if (data.success) {
                setCareerData(data.data);
            } else {
                // Don't show error for missing career path, it's optional
                console.log('Career progress not available:', data.message);
            }
        } catch (err) {
            console.error('Error fetching career progress:', err);
        }
    };

    const fetchCareerGoals = async () => {
        if (!targetUserId) return;

        try {
            setGoalsLoading(true);
            const token = localStorage.getItem('token');
            const response = await api.get(`/career-goals/${targetUserId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = response.data;

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

        setIsGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const response = await api.post('/career-goals/generate-assessment', {
                userId: targetUserId,
                topic,
                description: `Self-assessment for career goal: ${topic}`
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const json = response.data;
            if (json.success) {
                alert(`Assessment created! Scenario ID: ${json.data.scenarioId}. Navigate to Challenges to find it, or it will appear in your dashboard.`);
            } else {
                console.error('[CareerPath] Failed to generate assessment:', json.message);
                alert(`Failed to generate assessment: ${json.message}`);
            }
        } catch (err) {
            console.error('[CareerPath] Error generating assessment:', err);
            alert('Error generating assessment. Please try again.');
        } finally {
            setIsGenerating(false);
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
                    <p className="text-2xl font-bold text-cyan-400">{careerData?.employee?.eloRating ?? 1000}</p>
                </div>
            </div>

            {/* Sub-tabs for Goals vs GROW */}
            <div className="flex gap-2 p-1 bg-black/30 rounded-lg">
                <button
                    onClick={() => setActiveTab('grow')}
                    className={`flex-1 py-2 px-4 rounded text-sm font-bold transition-all ${activeTab === 'grow'
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Award size={14} className="inline mr-2" />
                    GROW
                </button>
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
                                    isGenerating={isGenerating}
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

            {/* GROW Tab (GrowthTab Integration) */}
            {activeTab === 'grow' && (
                <GrowthTab
                    userId={targetUserId}
                    userName={careerData?.employee?.name?.split(' ')[0] || 'Operative'}
                    eloRating={careerData?.employee?.eloRating}
                    // For completed trainings, we can use the length of the array in careerData
                    completedTrainings={careerData?.completedTrainings?.length || 0}
                    userJobTitle={careerData?.employee?.department || 'Employee'} // Using department as job title proxy since specific job title isn't in careerData
                />
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
