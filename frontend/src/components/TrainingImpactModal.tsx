import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrainingImpactModalProps {
    isOpen: boolean;
    onClose: () => void;
    curriculumId: string;
    curriculumName: string;
}

interface OperativeDetail {
    id: string;
    name: string;
    department: string;
    preScore: number;
    postScore: number;
}

export const TrainingImpactModal: React.FC<TrainingImpactModalProps> = ({ isOpen, onClose, curriculumId, curriculumName }) => {
    const { token } = useAuth();
    const [operatives, setOperatives] = useState<OperativeDetail[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && curriculumId && token) {
            fetchOperatives();
        }
    }, [isOpen, curriculumId, token]);

    const fetchOperatives = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/analytics/operatives?curriculum=${curriculumId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setOperatives(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch operative details', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-4xl theme-bg-primary border theme-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b theme-border flex justify-between items-center bg-black/5 dark:bg-white/5">
                    <div>
                        <h2 className="text-lg font-bold theme-text-primary flex items-center gap-2">
                            Training Impact Analysis
                        </h2>
                        <p className="text-xs theme-text-secondary mt-1 font-mono uppercase tracking-wider">{curriculumName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors theme-text-secondary">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-black/5 dark:bg-black/40 theme-text-secondary uppercase font-mono sticky top-0 backdrop-blur-md z-10">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Operative</th>
                                        <th className="px-4 py-3 font-medium">Department</th>
                                        <th className="px-4 py-3 font-medium text-right">Pre-Score</th>
                                        <th className="px-4 py-3 font-medium text-right">Post-Score</th>
                                        <th className="px-4 py-3 font-medium text-right">Change</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                    {operatives.map((op) => {
                                        const change = op.postScore - op.preScore;
                                        return (
                                            <tr key={op.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 font-medium theme-text-primary">{op.name}</td>
                                                <td className="px-4 py-3 theme-text-secondary">{op.department}</td>
                                                <td className="px-4 py-3 text-right font-mono theme-text-secondary">{op.preScore || '-'}</td>
                                                <td className="px-4 py-3 text-right font-mono theme-text-primary font-bold">{op.postScore || '-'}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className={`flex items-center justify-end gap-1 font-mono ${change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'theme-text-secondary'
                                                        }`}>
                                                        {change > 0 && <TrendingUp size={12} />}
                                                        {change < 0 && <TrendingDown size={12} />}
                                                        {change === 0 && <Minus size={12} />}
                                                        <span>{change > 0 ? '+' : ''}{change}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {operatives.length === 0 && (
                                <div className="text-center py-8 theme-text-secondary">No data available for this curriculum.</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
