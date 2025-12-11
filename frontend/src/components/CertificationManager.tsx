import React, { useState, useEffect } from 'react';
import { Award, Plus, ExternalLink, Calendar, Building, Trash2, Edit2, X, Check } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';

interface Certification {
    id: string;
    name: string;
    issuer: string | null;
    issueDate: string | null;
    expiryDate: string | null;
    credentialId: string | null;
    credentialUrl: string | null;
    description: string | null;
    type: 'manual' | 'system';
    skill?: string;
}

interface CertificationManagerProps {
    userId?: string;
    readOnly?: boolean;
}

export const CertificationManager: React.FC<CertificationManagerProps> = ({
    userId,
    readOnly = false
}) => {
    const { user } = useAuth();
    const [certifications, setCertifications] = useState<{ manual: Certification[], system: Certification[] }>({ manual: [], system: [] });
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        issuer: '',
        issueDate: '',
        expiryDate: '',
        credentialId: '',
        credentialUrl: '',
        description: ''
    });

    const targetUserId = userId || user?.id;

    useEffect(() => {
        if (targetUserId) {
            fetchCertifications();
        }
    }, [targetUserId]);

    const fetchCertifications = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/certifications/user/${targetUserId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setCertifications(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch certifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const url = editingId
                ? `${API_BASE_URL}/api/certifications/${editingId}`
                : `${API_BASE_URL}/api/certifications`;

            const res = await fetch(url, {
                method: editingId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setShowAddForm(false);
                setEditingId(null);
                setFormData({ name: '', issuer: '', issueDate: '', expiryDate: '', credentialId: '', credentialUrl: '', description: '' });
                fetchCertifications();
            }
        } catch (error) {
            console.error('Failed to save certification:', error);
        }
    };

    const handleDelete = async (certId: string) => {
        if (!confirm('Are you sure you want to delete this certification?')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/certifications/${certId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchCertifications();
            }
        } catch (error) {
            console.error('Failed to delete certification:', error);
        }
    };

    const handleEdit = (cert: Certification) => {
        setFormData({
            name: cert.name,
            issuer: cert.issuer || '',
            issueDate: cert.issueDate || '',
            expiryDate: cert.expiryDate || '',
            credentialId: cert.credentialId || '',
            credentialUrl: cert.credentialUrl || '',
            description: cert.description || ''
        });
        setEditingId(cert.id);
        setShowAddForm(true);
    };

    const renderCertCard = (cert: Certification) => (
        <div
            key={cert.id}
            className={`p-4 rounded-lg border ${cert.type === 'system'
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-purple-500/5 border-purple-500/20'
                }`}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cert.type === 'system' ? 'bg-green-500/20' : 'bg-purple-500/20'
                        }`}>
                        <Award size={20} className={cert.type === 'system' ? 'text-green-400' : 'text-purple-400'} />
                    </div>
                    <div>
                        <h3 className="font-bold theme-text-primary text-sm">{cert.name}</h3>
                        {cert.issuer && (
                            <p className="text-xs theme-text-secondary flex items-center gap-1 mt-0.5">
                                <Building size={10} /> {cert.issuer}
                            </p>
                        )}
                    </div>
                </div>

                {cert.type === 'manual' && !readOnly && (
                    <div className="flex gap-1">
                        <button
                            onClick={() => handleEdit(cert)}
                            className="p-1.5 rounded hover:bg-white/10 transition-colors"
                        >
                            <Edit2 size={14} className="theme-text-secondary" />
                        </button>
                        <button
                            onClick={() => handleDelete(cert.id)}
                            className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
                        >
                            <Trash2 size={14} className="text-red-400" />
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                {cert.issueDate && (
                    <span className="px-2 py-1 rounded bg-white/5 theme-text-muted flex items-center gap-1">
                        <Calendar size={10} /> Issued: {new Date(cert.issueDate).toLocaleDateString()}
                    </span>
                )}
                {cert.expiryDate && (
                    <span className="px-2 py-1 rounded bg-white/5 theme-text-muted flex items-center gap-1">
                        <Calendar size={10} /> Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                    </span>
                )}
                {cert.type === 'system' && (
                    <span className="px-2 py-1 rounded bg-green-500/10 text-green-400">
                        ✓ VERIFIED
                    </span>
                )}
            </div>

            {cert.credentialUrl && (
                <a
                    href={cert.credentialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline"
                >
                    <ExternalLink size={12} /> View Credential
                </a>
            )}

            {cert.description && (
                <p className="mt-2 text-xs theme-text-muted">{cert.description}</p>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 theme-text-muted">
                Loading certifications...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold theme-text-primary flex items-center gap-2">
                    <Award size={20} className="text-purple-400" />
                    MY CERTIFICATIONS
                    <span className="text-xs theme-text-muted font-normal">
                        ({certifications.manual.length + certifications.system.length} total)
                    </span>
                </h2>

                {!readOnly && !showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-bold rounded hover:bg-purple-500/30 transition-colors flex items-center gap-1"
                    >
                        <Plus size={14} /> ADD CERTIFICATE
                    </button>
                )}
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
                <form onSubmit={handleSubmit} className="theme-bg-tertiary p-4 rounded-lg border theme-border space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold theme-text-primary text-sm">
                            {editingId ? 'Edit Certificate' : 'Add New Certificate'}
                        </h3>
                        <button
                            type="button"
                            onClick={() => { setShowAddForm(false); setEditingId(null); }}
                            className="p-1 rounded hover:bg-white/10"
                        >
                            <X size={16} className="theme-text-secondary" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs theme-text-muted block mb-1">Certificate Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="w-full px-3 py-2 bg-black/20 border theme-border rounded text-sm theme-text-primary"
                                placeholder="e.g., AWS Solutions Architect"
                            />
                        </div>
                        <div>
                            <label className="text-xs theme-text-muted block mb-1">Issuing Organization</label>
                            <input
                                type="text"
                                value={formData.issuer}
                                onChange={e => setFormData({ ...formData, issuer: e.target.value })}
                                className="w-full px-3 py-2 bg-black/20 border theme-border rounded text-sm theme-text-primary"
                                placeholder="e.g., Amazon Web Services"
                            />
                        </div>
                        <div>
                            <label className="text-xs theme-text-muted block mb-1">Issue Date</label>
                            <input
                                type="date"
                                value={formData.issueDate}
                                onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
                                className="w-full px-3 py-2 bg-black/20 border theme-border rounded text-sm theme-text-primary"
                            />
                        </div>
                        <div>
                            <label className="text-xs theme-text-muted block mb-1">Expiry Date</label>
                            <input
                                type="date"
                                value={formData.expiryDate}
                                onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                                className="w-full px-3 py-2 bg-black/20 border theme-border rounded text-sm theme-text-primary"
                            />
                        </div>
                        <div>
                            <label className="text-xs theme-text-muted block mb-1">Credential ID</label>
                            <input
                                type="text"
                                value={formData.credentialId}
                                onChange={e => setFormData({ ...formData, credentialId: e.target.value })}
                                className="w-full px-3 py-2 bg-black/20 border theme-border rounded text-sm theme-text-primary"
                                placeholder="e.g., ABC123XYZ"
                            />
                        </div>
                        <div>
                            <label className="text-xs theme-text-muted block mb-1">Credential URL</label>
                            <input
                                type="url"
                                value={formData.credentialUrl}
                                onChange={e => setFormData({ ...formData, credentialUrl: e.target.value })}
                                className="w-full px-3 py-2 bg-black/20 border theme-border rounded text-sm theme-text-primary"
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs theme-text-muted block mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 bg-black/20 border theme-border rounded text-sm theme-text-primary resize-none"
                            rows={2}
                            placeholder="Brief description of the certification..."
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => { setShowAddForm(false); setEditingId(null); }}
                            className="px-4 py-2 text-xs font-bold theme-text-secondary hover:theme-text-primary transition-colors"
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-purple-500 text-white text-xs font-bold rounded hover:bg-purple-400 transition-colors flex items-center gap-1"
                        >
                            <Check size={14} /> {editingId ? 'UPDATE' : 'ADD'} CERTIFICATE
                        </button>
                    </div>
                </form>
            )}

            {/* System Certifications (from completed trainings) */}
            {certifications.system.length > 0 && (
                <div>
                    <h3 className="text-xs font-bold theme-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Check size={14} className="text-green-400" />
                        Verified Training Certifications
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {certifications.system.map(renderCertCard)}
                    </div>
                </div>
            )}

            {/* Manual Certifications */}
            {certifications.manual.length > 0 && (
                <div>
                    <h3 className="text-xs font-bold theme-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Award size={14} className="text-purple-400" />
                        External Certifications
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {certifications.manual.map(renderCertCard)}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {certifications.manual.length === 0 && certifications.system.length === 0 && (
                <div className="text-center py-12 theme-text-muted">
                    <Award size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No certifications yet</p>
                    {!readOnly && (
                        <p className="text-xs mt-1">Complete trainings or add your external certificates</p>
                    )}
                </div>
            )}
        </div>
    );
};
