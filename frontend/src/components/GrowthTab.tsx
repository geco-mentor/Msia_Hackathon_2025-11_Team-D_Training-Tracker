import React from 'react';
import { Target, Compass, Lightbulb, Zap, TrendingUp, Award, Sparkles } from 'lucide-react';

interface GrowthTabProps {
    userName?: string;
    completedTrainings?: number;
    eloRating?: number;
}

export const GrowthTab: React.FC<GrowthTabProps> = ({
    userName = 'Operative',
    completedTrainings = 0,
    eloRating = 1000
}) => {
    const growComponents = [
        {
            letter: 'G',
            title: 'GOAL',
            subtitle: 'Where do you want to be?',
            description: 'Set clear, achievable goals for your career progression. What skills do you want to master? What position do you aspire to?',
            icon: Target,
            color: 'from-green-500 to-emerald-600',
            bgColor: 'bg-green-500/10',
            borderColor: 'border-green-500/30',
            tips: [
                'Identify skills you want to develop',
                'Set a target ELO rating milestone',
                'Visualize your ideal role in 1-2 years'
            ]
        },
        {
            letter: 'R',
            title: 'REALITY',
            subtitle: 'Where are you now?',
            description: 'Honestly assess your current skills and knowledge. What are your strengths? What areas need improvement?',
            icon: Compass,
            color: 'from-cyan-500 to-blue-600',
            bgColor: 'bg-cyan-500/10',
            borderColor: 'border-cyan-500/30',
            tips: [
                `Your current ELO: ${eloRating}`,
                `Completed trainings: ${completedTrainings}`,
                'Review your assessment feedback'
            ]
        },
        {
            letter: 'O',
            title: 'OPTIONS',
            subtitle: 'What paths are available?',
            description: 'Explore the training opportunities, courses, and career paths available to you. What skills are in demand?',
            icon: Lightbulb,
            color: 'from-yellow-500 to-orange-600',
            bgColor: 'bg-yellow-500/10',
            borderColor: 'border-yellow-500/30',
            tips: [
                'Browse available CTF challenges',
                'Discuss with your team lead',
                'Check the career path requirements'
            ]
        },
        {
            letter: 'W',
            title: 'WILL',
            subtitle: 'What will you commit to?',
            description: 'Take action! Commit to specific trainings and set deadlines for yourself. Consistency is key to growth.',
            icon: Zap,
            color: 'from-purple-500 to-pink-600',
            bgColor: 'bg-purple-500/10',
            borderColor: 'border-purple-500/30',
            tips: [
                'Start your next training today',
                'Set a weekly learning goal',
                'Track progress in your profile'
            ]
        }
    ];

    const motivationalQuotes = [
        "The expert in anything was once a beginner.",
        "Learning is not attained by chance, it must be sought for with ardor.",
        "The more you learn, the more you earn.",
        "Invest in yourself. Your career is the engine of your wealth.",
        "Growth is never by mere chance; it is the result of forces working together."
    ];

    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header */}
            <div className="text-center py-6">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-full mb-4">
                    <TrendingUp className="text-cyan-400" size={24} />
                    <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                        GROWTH MINDSET
                    </span>
                </div>
                <p className="theme-text-secondary max-w-xl mx-auto">
                    Welcome, <span className="text-cyan-400 font-bold">{userName}</span>!
                    Embrace continuous learning and watch your career flourish.
                </p>
            </div>

            {/* Motivational Quote */}
            <div className="relative overflow-hidden theme-bg-secondary rounded-lg p-6 border border-white/5">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles size={64} />
                </div>
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                        <Award size={24} className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-yellow-400 font-bold uppercase tracking-wider mb-1">Daily Inspiration</p>
                        <blockquote className="text-lg theme-text-primary italic">
                            "{randomQuote}"
                        </blockquote>
                    </div>
                </div>
            </div>

            {/* GROW Framework Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {growComponents.map((component, idx) => {
                    const Icon = component.icon;
                    return (
                        <div
                            key={idx}
                            className={`theme-bg-secondary rounded-lg p-6 border ${component.borderColor} hover:scale-[1.02] transition-all duration-300 group`}
                        >
                            {/* Header */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${component.color} flex items-center justify-center shadow-lg`}>
                                    <span className="text-2xl font-black text-white">{component.letter}</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold theme-text-primary group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-400 transition-all">
                                        {component.title}
                                    </h3>
                                    <p className="text-sm theme-text-secondary">{component.subtitle}</p>
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-sm theme-text-secondary mb-4 leading-relaxed">
                                {component.description}
                            </p>

                            {/* Tips */}
                            <div className={`${component.bgColor} rounded-lg p-4`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon size={16} className="text-cyan-400" />
                                    <span className="text-xs font-bold text-cyan-400 uppercase">Action Items</span>
                                </div>
                                <ul className="space-y-1">
                                    {component.tips.map((tip, tipIdx) => (
                                        <li key={tipIdx} className="text-sm theme-text-secondary flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Call to Action */}
            <div className="text-center py-8 theme-bg-secondary rounded-lg border border-purple-500/30">
                <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-3">
                    Ready to Level Up?
                </h3>
                <p className="theme-text-secondary mb-6 max-w-md mx-auto">
                    Every training you complete brings you closer to your goals.
                    Start your next challenge and watch your ELO grow!
                </p>
                <button
                    onClick={() => window.location.hash = '#challenges'}
                    className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold rounded-lg hover:from-cyan-400 hover:to-purple-500 transition-all transform hover:scale-105 shadow-lg"
                >
                    START TRAINING →
                </button>
            </div>
        </div>
    );
};
