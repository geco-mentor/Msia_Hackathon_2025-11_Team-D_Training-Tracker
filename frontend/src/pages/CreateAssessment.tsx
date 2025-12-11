import React, { useState } from 'react';
import AssessmentUploader from '../components/AssessmentUploader';
import { ArrowLeft, Save, Check, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CreateAssessment: React.FC = () => {
    const navigate = useNavigate();
    const [generatedScenario, setGeneratedScenario] = useState<any>(null);

    const handleUploadComplete = (scenario: any) => {
        setGeneratedScenario(scenario);
    };

    const handleSave = () => {
        // In a real app, you might want to allow editing the draft before "publishing"
        // For now, we just navigate back as it's already saved as draft
        navigate('/admin/dashboard');
    };

    return (
        <div className="min-h-screen theme-bg-primary text-cyan-50 font-mono selection:bg-cyan-500/30 p-8">
            <div className="max-w-5xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 theme-text-secondary hover:text-cyan-400 mb-8 transition-colors group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    BACK_TO_DASHBOARD
                </button>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2 theme-text-primary tracking-widest flex items-center gap-3">
                        <span className="text-cyan-400">&gt;_</span>
                        CREATE ASSESSMENT MODULE
                    </h1>
                    <p className="theme-text-secondary text-sm border-l-2 border-cyan-500/30 pl-4">
                        Upload training materials (PDF/Text) to automatically generate CTF scenarios and rubrics using AI.
                    </p>
                </div>

                {!generatedScenario ? (
                    <AssessmentUploader onUploadComplete={handleUploadComplete} />
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg flex items-center gap-3 text-green-400">
                            <Check className="w-6 h-6" />
                            <div>
                                <h3 className="font-bold tracking-wider">RUBRICS GENERATED SUCCESSFULLY</h3>
                                <p className="text-xs opacity-80 font-mono">Extracted text saved to S3. Assessment rubrics are ready.</p>
                            </div>
                        </div>

                        <div className="theme-bg-secondary rounded-xl border border-white/5 p-6 space-y-8">

                            {/* 9 Rubrics Grid */}
                            <div>
                                <label className="block text-xs font-bold text-gray-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                                    <Shield className="w-3 h-3" />
                                    Evaluation Rubrics (9 Criteria)
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                    {/* Generic Criteria */}
                                    <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                                        <h4 className="text-cyan-700 font-bold mb-3 text-sm border-b border-white/10 pb-2">GENERIC CRITERIA</h4>
                                        <ul className="space-y-2">
                                            {generatedScenario.rubric?.generic?.map((c: string, i: number) => (
                                                <li key={i} className="text-xs text-gray-900 flex items-start gap-2">
                                                    <span className="text-cyan-700 mt-0.5">•</span>
                                                    {c}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Department Criteria - Now shows all selected departments */}
                                    <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                                        <h4 className="text-purple-700 font-bold mb-3 text-sm border-b border-white/10 pb-2">DEPARTMENT CRITERIA</h4>
                                        {Array.isArray(generatedScenario.rubric?.department) && generatedScenario.rubric.department.length > 0 ? (
                                            <div className="space-y-4">
                                                {generatedScenario.rubric.department.map((dept: { deptName: string; criteria: string[] }, deptIdx: number) => (
                                                    <div key={deptIdx}>
                                                        <h5 className="text-purple-800 text-xs font-semibold mb-2 uppercase">{dept.deptName}</h5>
                                                        <ul className="space-y-1.5">
                                                            {dept.criteria?.map((c: string, i: number) => (
                                                                <li key={i} className="text-xs text-gray-900 flex items-start gap-2">
                                                                    <span className="text-purple-700 mt-0.5">•</span>
                                                                    {c}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-700 italic">No department selected</p>
                                        )}
                                    </div>

                                    {/* Module Criteria */}
                                    <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                                        <h4 className="text-pink-700 font-bold mb-3 text-sm border-b border-white/10 pb-2">MODULE CRITERIA</h4>
                                        <ul className="space-y-2">
                                            {generatedScenario.rubric?.module?.map((c: string, i: number) => (
                                                <li key={i} className="text-xs text-gray-900 flex items-start gap-2">
                                                    <span className="text-pink-700 mt-0.5">•</span>
                                                    {c}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                </div>
                            </div>

                        </div>

                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => setGeneratedScenario(null)}
                                className="px-6 py-3 rounded-lg font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors tracking-wider text-sm"
                            >
                                UPLOAD ANOTHER
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-3 rounded-lg font-bold bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20 flex items-center gap-2 tracking-wider text-sm"
                            >
                                <Save className="w-4 h-4" />
                                SAVE & RETURN
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateAssessment;
