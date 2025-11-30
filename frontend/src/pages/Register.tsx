import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Register: React.FC = () => {
    const navigate = useNavigate();
    const { register } = useAuth();

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        employee_id: '',
        password: '',
        job_title: '',
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await register(formData);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
                <div className="w-full max-w-md space-y-8 animate-enter">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-display font-bold text-slate-900">Create Account</h2>
                        <p className="mt-2 text-slate-600">Join the team and start tracking your progress</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="input-label" htmlFor="name">Full Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="input-field mt-1"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="input-label" htmlFor="username">Username</label>
                                    <input
                                        type="text"
                                        id="username"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        className="input-field mt-1"
                                        placeholder="johndoe"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="input-label" htmlFor="employee_id">Employee ID</label>
                                    <input
                                        type="text"
                                        id="employee_id"
                                        name="employee_id"
                                        value={formData.employee_id}
                                        onChange={handleChange}
                                        className="input-field mt-1"
                                        placeholder="EMP-001"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="input-label" htmlFor="job_title">Job Title</label>
                                <input
                                    type="text"
                                    id="job_title"
                                    name="job_title"
                                    value={formData.job_title}
                                    onChange={handleChange}
                                    className="input-field mt-1"
                                    placeholder="Software Engineer"
                                    required
                                />
                            </div>

                            <div>
                                <label className="input-label" htmlFor="department">Department</label>
                                <input
                                    type="text"
                                    id="department"
                                    name="department"
                                    value={(formData as any).department || ''}
                                    onChange={handleChange}
                                    className="input-field mt-1"
                                    placeholder="Engineering"
                                />
                            </div>

                            <div>
                                <label className="input-label" htmlFor="password">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input-field mt-1"
                                    placeholder="••••••••"
                                    required
                                    minLength={8}
                                />
                                <p className="mt-1 text-xs text-slate-500">Must be at least 8 characters</p>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-700 text-sm animate-fade-in">
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-3 text-lg shadow-glow"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="loading-spinner w-5 h-5 border-2"></div>
                                    <span>Creating Account...</span>
                                </div>
                            ) : (
                                'Create Account'
                            )}
                        </button>

                        <p className="text-center text-sm text-slate-600">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </form>
                </div>
            </div>

            {/* Right Side - Visual */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 z-0"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0"></div>

                <div className="relative z-10 max-w-lg text-center p-12">
                    <div className="mb-8 relative">
                        <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 animate-pulse-slow"></div>
                        <img
                            src="https://illustrations.popsy.co/amber/surr-upgrade.svg"
                            alt="Growth"
                            className="relative w-full h-auto drop-shadow-2xl animate-float"
                        />
                    </div>
                    <h3 className="text-3xl font-display font-bold text-white mb-4">Accelerate Your Growth</h3>
                    <p className="text-indigo-200 text-lg leading-relaxed">
                        Track your skills, complete assessments, and visualize your professional development journey with AI-powered insights.
                    </p>
                </div>
            </div>
        </div>
    );
};
