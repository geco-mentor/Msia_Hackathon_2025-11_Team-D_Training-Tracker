import React, { useState, useEffect } from 'react';
import { Target, CheckSquare, Square, Loader, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Goal {
    id: string;
    description: string;
    completed: boolean;
}

export const GoalSetter: React.FC = () => {
    const { user } = useAuth();
    const [goals, setGoals] = useState<Goal[]>([]);
    const [keyword, setKeyword] = useState('');
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (user?.id) {
            fetchGoals();
        }
    }, [user?.id]);

    const fetchGoals = async () => {
        try {
            const res = await fetch(`http://localhost:3001/api/goals/${user?.id}`);
            const data = await res.json();
            if (data.success) {
                setGoals(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch goals', err);
        }
    };

    const generateGoals = async () => {
        if (!keyword) return;
        setGenerating(true);
        try {
            const res = await fetch('http://localhost:3001/api/goals/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword, userId: user?.id })
            });
            const data = await res.json();
            if (data.success) {
                setGoals([...data.data, ...goals]);
                setKeyword('');
            }
        } catch (err) {
            console.error('Failed to generate goals', err);
        } finally {
            setGenerating(false);
        }
    };

    const toggleGoal = async (id: string, currentStatus: boolean) => {
        // Optimistic update
        setGoals(goals.map(g => g.id === id ? { ...g, completed: !currentStatus } : g));

        try {
            await fetch(`http://localhost:3001/api/goals/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: !currentStatus })
            });
        } catch (err) {
            // Revert on error
            setGoals(goals.map(g => g.id === id ? { ...g, completed: currentStatus } : g));
        }
    };

    return (
        <div className="bg-[#111] border border-white/5 rounded-lg p-6 h-full flex flex-col">
            <h2 className="text-lg font-bold text-white tracking-wider flex items-center gap-2 mb-6">
                <Target size={18} className="text-pink-400" />
                PERSONALIZED GOALS
            </h2>

            <div className="flex gap-2 mb-6">
                <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="E.g., AWS Cloud, React..."
                    className="flex-1 bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-pink-500/50 focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && generateGoals()}
                />
                <button
                    onClick={generateGoals}
                    disabled={generating || !keyword}
                    className="px-3 py-2 bg-pink-600/20 border border-pink-500/50 text-pink-400 rounded hover:bg-pink-600/30 transition-colors disabled:opacity-50"
                >
                    {generating ? <Loader size={18} className="animate-spin" /> : <Sparkles size={18} />}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {goals.length === 0 ? (
                    <div className="text-center text-gray-600 text-xs py-8">
                        No active goals. Generate some to get started!
                    </div>
                ) : (
                    goals.map((goal) => (
                        <div
                            key={goal.id}
                            onClick={() => toggleGoal(goal.id, goal.completed)}
                            className={`p-3 rounded border cursor-pointer transition-all group flex items-start gap-3 ${goal.completed ? 'bg-green-900/5 border-green-500/10 opacity-50' : 'bg-white/5 border-white/5 hover:border-pink-500/30'}`}
                        >
                            <div className={`mt-0.5 ${goal.completed ? 'text-green-500' : 'text-gray-500 group-hover:text-pink-400'}`}>
                                {goal.completed ? <CheckSquare size={16} /> : <Square size={16} />}
                            </div>
                            <span className={`text-sm ${goal.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                                {goal.description}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
