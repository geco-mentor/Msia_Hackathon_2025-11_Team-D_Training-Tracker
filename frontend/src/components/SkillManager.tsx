import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check, Loader, Star, Code } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface Skill {
    id: string;
    skill_name: string;
    proficiency_level: number;
    description: string | null;
    created_at: string;
}

const PROFICIENCY_LABELS = ['', 'Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'];

export const SkillManager: React.FC = () => {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state
    const [skillName, setSkillName] = useState('');
    const [proficiency, setProficiency] = useState(3);
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchSkills = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/skills`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setSkills(data.data);
            }
        } catch (error) {
            console.error('Error fetching skills:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSkills();
    }, []);

    const handleAddSkill = async () => {
        if (!skillName.trim()) return;
        setSubmitting(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/skills`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    skillName: skillName.trim(),
                    proficiencyLevel: proficiency,
                    description: description.trim() || null
                })
            });
            const data = await response.json();
            if (data.success) {
                setSkills(prev => [data.data, ...prev]);
                resetForm();
            } else {
                alert(data.message || 'Failed to add skill');
            }
        } catch (error) {
            console.error('Error adding skill:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateSkill = async (skillId: string) => {
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/skills/${skillId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    proficiencyLevel: proficiency,
                    description: description.trim() || null
                })
            });
            const data = await response.json();
            if (data.success) {
                setSkills(prev => prev.map(s => s.id === skillId ? data.data : s));
                resetForm();
            }
        } catch (error) {
            console.error('Error updating skill:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteSkill = async (skillId: string) => {
        if (!confirm('Are you sure you want to delete this skill?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/skills/${skillId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setSkills(prev => prev.filter(s => s.id !== skillId));
            }
        } catch (error) {
            console.error('Error deleting skill:', error);
        }
    };

    const resetForm = () => {
        setIsAdding(false);
        setEditingId(null);
        setSkillName('');
        setProficiency(3);
        setDescription('');
    };

    const startEditing = (skill: Skill) => {
        setEditingId(skill.id);
        setSkillName(skill.skill_name);
        setProficiency(skill.proficiency_level);
        setDescription(skill.description || '');
        setIsAdding(false);
    };

    const renderStars = (level: number, interactive = false, onChange?: (val: number) => void) => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => interactive && onChange && onChange(star)}
                        className={`transition-colors ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
                        disabled={!interactive}
                    >
                        <Star
                            size={interactive ? 20 : 14}
                            className={star <= level ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
                        />
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-purple-400 tracking-wider flex items-center gap-2">
                    <Code size={18} />
                    MY SKILLS
                </h2>
                {!isAdding && !editingId && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded hover:bg-purple-500/30 transition-colors"
                    >
                        <Plus size={14} />
                        ADD SKILL
                    </button>
                )}
            </div>

            {/* Add/Edit Form */}
            {(isAdding || editingId) && (
                <div className="bg-black/40 border border-purple-500/30 rounded-lg p-4 mb-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-purple-400">
                            {isAdding ? 'Add New Skill' : 'Edit Skill'}
                        </h3>
                        <button onClick={resetForm} className="text-gray-400 hover:text-white">
                            <X size={16} />
                        </button>
                    </div>

                    {isAdding && (
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Skill Name</label>
                            <input
                                type="text"
                                value={skillName}
                                onChange={(e) => setSkillName(e.target.value)}
                                placeholder="e.g., Python, Project Management, Data Analysis"
                                className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-sm theme-text-primary focus:outline-none focus:border-purple-500/50"
                            />
                        </div>
                    )}

                    <div>
                        <label className="text-xs text-gray-400 block mb-2">
                            Proficiency Level: <span className="text-purple-400 font-bold">{PROFICIENCY_LABELS[proficiency]}</span>
                        </label>
                        <div className="flex items-center gap-4">
                            {renderStars(proficiency, true, setProficiency)}
                            <span className="text-xs text-gray-500">({proficiency}/5)</span>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Description (optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Years of experience, projects, etc."
                            rows={2}
                            className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-sm theme-text-primary focus:outline-none focus:border-purple-500/50 resize-none"
                        />
                    </div>

                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={resetForm}
                            className="px-4 py-2 text-xs font-bold text-gray-400 border border-white/10 rounded hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => editingId ? handleUpdateSkill(editingId) : handleAddSkill()}
                            disabled={submitting || (isAdding && !skillName.trim())}
                            className="px-4 py-2 text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded hover:bg-purple-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {submitting ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                            {editingId ? 'Update' : 'Add'}
                        </button>
                    </div>
                </div>
            )}

            {/* Skills List */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader size={24} className="text-purple-400 animate-spin" />
                </div>
            ) : skills.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border border-dashed border-white/10 rounded-lg">
                    <Code size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No skills added yet.</p>
                    <p className="text-xs mt-1">Click "Add Skill" to start building your skill profile.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {skills.map(skill => (
                        <div
                            key={skill.id}
                            className="bg-black/40 border border-white/5 rounded-lg p-3 flex items-center justify-between group hover:border-purple-500/20 transition-colors"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold theme-text-primary text-sm">{skill.skill_name}</span>
                                    {renderStars(skill.proficiency_level)}
                                    <span className="text-xs text-gray-500">{PROFICIENCY_LABELS[skill.proficiency_level]}</span>
                                </div>
                                {skill.description && (
                                    <p className="text-xs text-gray-500 mt-1">{skill.description}</p>
                                )}
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => startEditing(skill)}
                                    className="p-1.5 text-gray-400 hover:text-cyan-400 transition-colors"
                                    title="Edit"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={() => handleDeleteSkill(skill.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
