import React, { useState, useEffect } from 'react';
import { TrendingUp, Lock, CheckCircle, Award, Target } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchCareerProgress();
    }, [userId, user?.id]);

    const fetchCareerProgress = async () => {
        const targetUserId = userId || user?.id;
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
                setError(data.message || 'Failed to load career progress');
            }
        } catch (err) {
            console.error('Error fetching career progress:', err);
            setError('Failed to load career progress');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !careerData) {
        return (
            <div className="text-center py-12 theme-text-muted">
                <Target size={48} className="mx-auto mb-4 opacity-50" />
                <p>{error || 'No career path assigned'}</p>
                <p className="text-sm mt-2">Contact your manager to get assigned to a career path.</p>
            </div>
        );
    }

    const { levels, careerPath, employee } = careerData;

    // Compact view for sidebar/cards
    if (compact) {
        const currentLevelData = levels.find(l => l.isCurrent);
        const nextLevel = levels.find(l => l.level === (currentLevelData?.level || 0) + 1);

        return (
            <div className="theme-bg-secondary rounded-lg p-4 border theme-border">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold theme-text-muted uppercase">Career Path</span>
                    <span className="text-xs text-cyan-400">{careerPath?.name || 'Not Assigned'}</span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                        <Award size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="font-bold theme-text-primary">{currentLevelData?.title || 'Level 1'}</p>
                        <p className="text-xs theme-text-muted">Level {currentLevelData?.level || 1}</p>
                    </div>
                </div>

                {nextLevel && (
                    <div className="bg-black/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs theme-text-muted">Next: {nextLevel.title}</span>
                            <span className="text-xs text-cyan-400">{nextLevel.trainingProgress}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
                                style={{ width: `${nextLevel.trainingProgress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Full view
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold theme-text-primary flex items-center gap-2">
                        <TrendingUp size={24} className="text-cyan-400" />
                        {careerPath?.name || 'Career Path'}
                    </h2>
                    <p className="theme-text-secondary text-sm mt-1">
                        {careerPath?.description || 'Your progression journey'}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs theme-text-muted">Current ELO</p>
                    <p className="text-2xl font-bold text-cyan-400">{employee.eloRating}</p>
                </div>
            </div>

            {/* Level Progress Timeline */}
            <div className="relative">
                {/* Connection Line */}
                <div className="absolute left-6 top-12 bottom-12 w-0.5 bg-gray-700"></div>

                {/* Levels */}
                <div className="space-y-6">
                    {levels.map((level, idx) => (
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
    );
};
