import React from 'react';
import { Trophy, Lock, CheckCircle, Play } from 'lucide-react';

interface ChallengeCardProps {
    challenge: any;
    onClick: () => void;
    status?: 'solved' | 'unsolved';
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, onClick, status = 'unsolved' }) => {
    return (
        <div
            onClick={onClick}
            className="bg-[#111] border border-white/10 rounded-lg p-4 cursor-pointer hover:border-cyan-500/50 transition-all group relative overflow-hidden h-32 flex flex-col justify-between"
        >
            <div className="flex justify-between items-start">
                <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">{challenge.category || 'General'}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${challenge.difficulty === 'Hard' ? 'border-red-500/30 text-red-400' :
                        challenge.difficulty === 'Medium' ? 'border-yellow-500/30 text-yellow-400' :
                            'border-green-500/30 text-green-400'
                    }`}>
                    {challenge.difficulty}
                </span>
            </div>

            <h3 className="text-sm font-bold text-gray-200 group-hover:text-cyan-400 transition-colors line-clamp-2">
                {challenge.title || challenge.skill}
            </h3>

            <div className="flex justify-between items-end mt-2">
                <span className="text-xs text-gray-600 font-mono">{challenge.solves || 0} solves</span>

                <div className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 ${status === 'solved'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-white/5 text-gray-400 border border-white/10 group-hover:bg-cyan-500/10 group-hover:text-cyan-400 group-hover:border-cyan-500/30'
                    }`}>
                    {status === 'solved' ? (
                        <>
                            <CheckCircle size={12} />
                            SOLVED
                        </>
                    ) : (
                        <>
                            <Play size={12} />
                            START
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
