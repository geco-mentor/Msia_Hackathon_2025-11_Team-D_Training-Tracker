import React, { useRef, useState, useEffect } from 'react';
import { Columns, Check } from 'lucide-react';

interface ColumnToggleProps {
    columns: { key: string; label: string }[];
    visibleColumns: Set<string>;
    onToggle: (key: string) => void;
}

export const ColumnToggle: React.FC<ColumnToggleProps> = ({ columns, visibleColumns, onToggle }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 border theme-border rounded hover:bg-white/5 transition-colors theme-text-secondary flex items-center gap-2 text-xs"
                aria-label="Toggle columns"
            >
                <Columns size={14} />
                <span className="hidden sm:inline">Columns</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 theme-bg-secondary border theme-border rounded-lg shadow-xl z-50 py-1 max-h-60 overflow-y-auto backdrop-blur-md">
                    <div className="px-3 py-2 text-xs font-mono uppercase theme-text-secondary border-b theme-border opacity-70 mb-1">
                        Visible Columns
                    </div>
                    {columns.map((col) => {
                        const isVisible = visibleColumns.has(col.key);
                        return (
                            <button
                                key={col.key}
                                onClick={() => onToggle(col.key)}
                                className={`w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors flex items-center justify-between ${isVisible ? 'theme-text-primary' : 'theme-text-secondary opacity-50'
                                    }`}
                            >
                                <span>{col.label}</span>
                                {isVisible && <Check size={12} className="text-cyan-400" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
