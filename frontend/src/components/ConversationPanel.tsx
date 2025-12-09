import React, { useEffect, useRef } from 'react';
import { Bot, User, Star, Zap, CheckCircle, XCircle, MessageSquare } from 'lucide-react';

export interface ConversationMessage {
    id: string;
    type: 'ai-question' | 'user-answer' | 'evaluation';
    content: string;
    timestamp: Date;
    metadata?: {
        questionNumber?: number;
        score?: number;
        xpEarned?: number;
        difficulty?: 'Easy' | 'Normal' | 'Hard';
        feedback?: string;
        scenario?: string;
        missionName?: string;
    };
}

interface ConversationPanelProps {
    messages: ConversationMessage[];
    isLoading?: boolean;
    accentColor?: 'cyan' | 'purple';
}

const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 border-green-500/50 bg-green-500/10';
    if (score >= 60) return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
    return 'text-red-400 border-red-500/50 bg-red-500/10';
};

const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
        case 'Easy': return 'text-green-400 bg-green-500/20';
        case 'Normal': return 'text-yellow-400 bg-yellow-500/20';
        case 'Hard': return 'text-red-400 bg-red-500/20';
        default: return 'text-gray-400 bg-gray-500/20';
    }
};

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
    messages,
    isLoading = false,
    accentColor = 'cyan'
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const accent = accentColor === 'cyan' ? 'cyan' : 'purple';

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    if (messages.length === 0 && !isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 p-6">
                <MessageSquare size={48} className="mb-4 opacity-50" />
                <p className="text-sm text-center">Your mission log will appear here as you progress...</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className={`p-3 border-b border-${accent}-500/20 bg-${accent}-500/5`}>
                <h3 className={`text-sm font-bold text-${accent}-400 flex items-center gap-2`}>
                    <MessageSquare size={16} />
                    📡 MISSION LOG
                </h3>
            </div>

            {/* Messages Container */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
            >
                {messages.map((message, index) => (
                    <div
                        key={message.id}
                        className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        {message.type === 'ai-question' && (
                            <AIQuestionBubble message={message} accent={accent} />
                        )}
                        {message.type === 'user-answer' && (
                            <UserAnswerBubble message={message} />
                        )}
                        {message.type === 'evaluation' && (
                            <EvaluationCard message={message} />
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex items-center gap-2 text-gray-400 animate-pulse">
                        <Bot size={16} className={`text-${accent}-400`} />
                        <span className="text-sm">Processing...</span>
                        <div className="flex gap-1">
                            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// AI Question Bubble Component
const AIQuestionBubble: React.FC<{ message: ConversationMessage; accent: string }> = ({ message, accent }) => {
    return (
        <div className="flex gap-3">
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-${accent}-500 to-blue-500 flex items-center justify-center shadow-lg shadow-${accent}-500/20`}>
                <Bot size={16} className="text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 space-y-2">
                {/* Header */}
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold text-${accent}-400`}>🤖 AI HANDLER</span>
                    {message.metadata?.questionNumber && (
                        <span className="text-xs text-gray-500">
                            Challenge #{message.metadata.questionNumber}
                        </span>
                    )}
                    {message.metadata?.difficulty && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getDifficultyStyle(message.metadata.difficulty)}`}>
                            {message.metadata.difficulty}
                        </span>
                    )}
                </div>

                {/* Mission Name */}
                {message.metadata?.missionName && (
                    <div className={`text-xs text-${accent}-300/70 font-mono`}>
                        {message.metadata.missionName}
                    </div>
                )}

                {/* Scenario (if present) */}
                {message.metadata?.scenario && (
                    <div className={`p-3 bg-${accent}-900/20 border border-${accent}-500/20 rounded-lg text-sm text-gray-300 relative`}>
                        <div className="absolute top-1 right-2 text-xs text-gray-500 font-mono">SITUATION</div>
                        {message.metadata.scenario}
                    </div>
                )}

                {/* Question */}
                <div className={`p-3 bg-${accent}-500/10 border border-${accent}-500/30 rounded-lg rounded-tl-none shadow-lg shadow-${accent}-500/5`}>
                    <p className="text-sm text-gray-200">❓ {message.content}</p>
                </div>
            </div>
        </div>
    );
};

// User Answer Bubble Component
const UserAnswerBubble: React.FC<{ message: ConversationMessage }> = ({ message }) => {
    return (
        <div className="flex gap-3 justify-end">
            {/* Content */}
            <div className="max-w-[85%] space-y-1">
                {/* Header */}
                <div className="flex items-center justify-end gap-2">
                    <span className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-xs font-bold text-purple-400">💬 YOUR RESPONSE</span>
                </div>

                {/* Answer */}
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg rounded-tr-none shadow-lg shadow-purple-500/5">
                    <p className="text-sm text-gray-200">{message.content}</p>
                </div>
            </div>

            {/* Avatar */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <User size={16} className="text-white" />
            </div>
        </div>
    );
};

// Evaluation Card Component
const EvaluationCard: React.FC<{ message: ConversationMessage }> = ({ message }) => {
    const score = message.metadata?.score || 0;
    const xpEarned = message.metadata?.xpEarned || 0;
    const feedback = message.metadata?.feedback || message.content;
    const passed = score >= 60;

    return (
        <div className="flex justify-center my-2">
            <div className={`w-full max-w-[90%] p-4 rounded-lg border ${getScoreColor(score)} backdrop-blur-sm`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {passed ? (
                            <CheckCircle size={18} className="text-green-400" />
                        ) : (
                            <XCircle size={18} className="text-red-400" />
                        )}
                        <span className="text-sm font-bold">📊 EVALUATION</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Score */}
                        <div className={`text-lg font-bold ${score >= 60 ? 'text-green-400' : 'text-red-400'}`}>
                            {score}%
                        </div>
                        {/* XP */}
                        {xpEarned > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded text-yellow-400 text-xs font-bold">
                                <Zap size={12} />
                                +{xpEarned} XP
                            </div>
                        )}
                    </div>
                </div>

                {/* Score Bar */}
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
                    <div
                        className={`h-full transition-all duration-500 ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${score}%` }}
                    />
                </div>

                {/* Feedback */}
                {feedback && (
                    <p className="text-xs text-gray-300">{feedback}</p>
                )}

                {/* Stars (for high scores) */}
                {score >= 80 && (
                    <div className="flex items-center gap-1 mt-2 justify-center">
                        <Star size={14} className="text-yellow-400 fill-yellow-400" />
                        <Star size={14} className="text-yellow-400 fill-yellow-400" />
                        <Star size={14} className={score >= 95 ? "text-yellow-400 fill-yellow-400" : "text-gray-600"} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConversationPanel;
