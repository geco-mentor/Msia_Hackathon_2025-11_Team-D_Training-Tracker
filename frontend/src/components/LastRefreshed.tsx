import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LastRefreshedProps {
    onRefresh: () => void;
    lastUpdated: Date;
    isLoading: boolean;
}

export const LastRefreshed: React.FC<LastRefreshedProps> = ({ onRefresh, lastUpdated, isLoading }) => {
    return (
        <div className="flex items-center gap-2 text-xs theme-text-secondary">
            <span className="font-mono opacity-60">Last sync: {lastUpdated.toLocaleTimeString()}</span>
            <button
                onClick={onRefresh}
                className={`p-1.5 hover:bg-white/5 rounded-full transition-colors ${isLoading ? 'animate-spin text-cyan-400' : 'hover:text-cyan-400'}`}
                aria-label="Refresh data"
                title="Refresh analytics"
            >
                <RefreshCw size={12} />
            </button>
        </div>
    );
};
