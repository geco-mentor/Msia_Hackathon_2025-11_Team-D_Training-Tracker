import React from 'react';
import { CheckCircle, Clock, Target, Award, Sparkles, BookOpen } from 'lucide-react';

interface Milestone {
    title: string;
    description: string;
    timeframe: string;
    actions: string[];
}

interface CareerRoadmapProps {
    roadmap: {
        milestones: Milestone[];
        skills_to_develop: string[];
    };
    certifications: string[];
    assessments: string[];
    onGenerateAssessment?: (topic: string) => void;
}

export const CareerRoadmap: React.FC<CareerRoadmapProps> = ({
    roadmap,
    certifications,
    assessments,
    onGenerateAssessment
}) => {
    return (
        <div className="space-y-6">
            {/* Milestones Timeline */}
            <div className="relative">
                <h3 className="text-sm font-bold theme-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Target size={16} className="text-cyan-400" />
                    Your Roadmap
                </h3>

                {/* Timeline line */}
                <div className="absolute left-4 top-12 bottom-4 w-0.5 bg-gradient-to-b from-cyan-500 to-purple-500"></div>

                <div className="space-y-4">
                    {roadmap.milestones.map((milestone, idx) => (
                        <div key={idx} className="relative pl-10">
                            {/* Timeline dot */}
                            <div className={`absolute left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${idx === 0
                                    ? 'bg-cyan-500 border-cyan-400'
                                    : 'bg-gray-800 border-gray-600'
                                }`}>
                                {idx === 0 ? (
                                    <CheckCircle size={12} className="text-white" />
                                ) : (
                                    <span className="text-[10px] text-gray-400">{idx + 1}</span>
                                )}
                            </div>

                            {/* Milestone card */}
                            <div className={`theme-bg-tertiary border rounded-lg p-4 ${idx === 0 ? 'border-cyan-500/30' : 'theme-border'
                                }`}>
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-bold theme-text-primary">{milestone.title}</h4>
                                    <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 rounded flex items-center gap-1">
                                        <Clock size={10} />
                                        {milestone.timeframe}
                                    </span>
                                </div>
                                <p className="text-sm theme-text-secondary mb-3">{milestone.description}</p>

                                {/* Actions */}
                                {milestone.actions && milestone.actions.length > 0 && (
                                    <div className="space-y-1">
                                        {milestone.actions.map((action, aIdx) => (
                                            <div key={aIdx} className="text-xs theme-text-muted flex items-start gap-2">
                                                <span className="text-cyan-400 mt-0.5">→</span>
                                                {action}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Skills to Develop */}
            {roadmap.skills_to_develop && roadmap.skills_to_develop.length > 0 && (
                <div className="theme-bg-tertiary border theme-border rounded-lg p-4">
                    <h3 className="text-sm font-bold theme-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Sparkles size={16} className="text-yellow-400" />
                        Skills to Develop
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {roadmap.skills_to_develop.map((skill, idx) => (
                            <span
                                key={idx}
                                className="px-3 py-1 text-sm bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-full"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Certifications & Assessments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recommended Certifications */}
                {certifications && certifications.length > 0 && (
                    <div className="theme-bg-tertiary border theme-border rounded-lg p-4">
                        <h3 className="text-sm font-bold theme-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Award size={16} className="text-green-400" />
                            Recommended Certifications
                        </h3>
                        <ul className="space-y-2">
                            {certifications.map((cert, idx) => (
                                <li key={idx} className="text-sm theme-text-secondary flex items-start gap-2">
                                    <span className="text-green-400 mt-0.5">✓</span>
                                    {cert}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Suggested Assessments */}
                {assessments && assessments.length > 0 && (
                    <div className="theme-bg-tertiary border theme-border rounded-lg p-4">
                        <h3 className="text-sm font-bold theme-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                            <BookOpen size={16} className="text-cyan-400" />
                            Suggested Assessments
                        </h3>
                        <ul className="space-y-2">
                            {assessments.map((assessment, idx) => (
                                <li key={idx} className="text-sm flex items-center justify-between">
                                    <span className="theme-text-secondary flex items-center gap-2">
                                        <span className="text-cyan-400">•</span>
                                        {assessment}
                                    </span>
                                    {onGenerateAssessment && (
                                        <button
                                            onClick={() => onGenerateAssessment(assessment)}
                                            className="px-2 py-1 text-xs bg-cyan-500/10 text-cyan-400 rounded hover:bg-cyan-500/20 transition-colors"
                                        >
                                            Take
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};
