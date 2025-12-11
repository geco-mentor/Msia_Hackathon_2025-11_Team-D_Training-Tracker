import React from 'react';
import kpiThresholds from '../config/kpiThresholds.json';

interface KpiCardProps {
    title: string;
    value: string | number;
    subtext?: string;
    icon: React.ReactNode;
    trend?: string;
    type?: 'completion' | 'assessments' | 'roi' | 'active';
    isLoading?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtext, icon, trend, type, isLoading }) => {
    if (isLoading) {
        return (
            <div className="p-6 rounded-xl border theme-border theme-bg-secondary h-[140px] animate-pulse">
                <div className="h-4 w-24 bg-white/10 rounded mb-4"></div>
                <div className="h-8 w-16 bg-white/10 rounded mb-4"></div>
                <div className="h-3 w-32 bg-white/10 rounded"></div>
            </div>
        );
    }

    let statusClass = 'theme-border theme-bg-secondary';
    const numValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));

    // Threshold Logic
    if (type === 'completion') {
        if (numValue >= kpiThresholds.completionRate) statusClass = 'border-green-500/30 bg-green-500/5';
        else if (numValue < 30) statusClass = 'border-red-500/30 bg-red-500/5';
    } else if (type === 'roi') {
        if (numValue >= kpiThresholds.trainingRoi) statusClass = 'border-green-500/30 bg-green-500/5';
        else if (numValue < 100) statusClass = 'border-yellow-500/30 bg-yellow-500/5';
    }

    return (
        <div className={`p-6 rounded-xl border ${statusClass} backdrop-blur-sm hover:scale-[1.02] transition-transform duration-200 ease-out group relative overflow-hidden`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xs font-mono uppercase theme-text-secondary tracking-wider">{title}</h3>
                    <div className="text-3xl font-bold mt-1 theme-text-primary">{value}</div>
                </div>
                <div className={`p-2 rounded-lg bg-white/5 group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-colors theme-text-secondary`}>
                    {icon}
                </div>
            </div>
            {subtext && (
                <div className="flex items-center gap-2">
                    {trend && (
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${trend.includes('+') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                            {trend}
                        </span>
                    )}
                    <span className="text-xs theme-text-secondary opacity-60 font-mono">{subtext}</span>
                </div>
            )}
            {/* Decorative glow */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-cyan-500/5 blur-2xl rounded-full group-hover:bg-cyan-500/10 transition-colors pointer-events-none"></div>
        </div>
    );
};
