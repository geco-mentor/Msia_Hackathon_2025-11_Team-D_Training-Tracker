import React from 'react';
import { CheckCircle, Play, Brain } from 'lucide-react';

interface ChallengeCardProps {
    challenge: any;
    onClick: () => void;
    preAssessmentCompleted?: boolean;
    postAssessmentCompleted?: boolean;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
    challenge,
    onClick,
    preAssessmentCompleted,
    postAssessmentCompleted
}) => {
    return (
        <div
            onClick={onClick}
            className="theme-bg-secondary border theme-border rounded-lg p-4 cursor-pointer hover:border-cyan-500/50 transition-all group relative overflow-hidden h-32 flex flex-col justify-between"
        >
            <div className="flex justify-between items-start">
                <span className="text-xs font-mono theme-text-muted uppercase tracking-wider">{challenge.category || 'General'}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${challenge.difficulty === 'Hard' ? 'border-red-500/30 text-red-500 dark:text-red-400' :
                    challenge.difficulty === 'Medium' ? 'border-yellow-500/30 text-yellow-600 dark:text-yellow-400' :
                        'border-green-500/30 text-green-600 dark:text-green-400'
                    }`}>
                    {challenge.difficulty}
                </span>
            </div>

            <h3 className="text-sm font-bold theme-text-secondary group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-2">
                {challenge.title || challenge.skill}
            </h3>

            <div className="flex justify-between items-end mt-2">
                <span className="text-xs theme-text-muted font-mono">{challenge.solves || 0} solves</span>

                {/* Show status: PRE-TEST → POST-TEST → COMPLETED */}
                {preAssessmentCompleted === false ? (
                    <div className="px-3 py-1 rounded text-xs font-bold flex items-center gap-1 bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        <Brain size={12} />
                        PRE-TEST
                    </div>
                ) : postAssessmentCompleted === true ? (
                    <div className="px-3 py-1 rounded text-xs font-bold flex items-center gap-1 bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                        <CheckCircle size={12} />
                        COMPLETED
                    </div>
                ) : (
                    <div className="px-3 py-1 rounded text-xs font-bold flex items-center gap-1 bg-cyan-100 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                        <Play size={12} />
                        POST-TEST
                    </div>
                )}
            </div>
        </div>
    );
};

