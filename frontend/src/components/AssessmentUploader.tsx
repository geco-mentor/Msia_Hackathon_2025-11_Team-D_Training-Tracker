import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, AlertCircle, Loader2, Calendar, Building, ChevronRight, ChevronDown, Check } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';

interface AssessmentUploaderProps {
    onUploadComplete: (scenario: any) => void;
}

interface Department {
    id: string;
    name: string;
}

const AssessmentUploader: React.FC<AssessmentUploaderProps> = ({ onUploadComplete }) => {
    const { user, token } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    // New State Fields
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    const [postAssessmentDate, setPostAssessmentDate] = useState<string>('');

    // Custom Dropdown State
    const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                if (!token) return;
                const response = await axios.get(`${API_BASE_URL}/api/assessments/departments`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setDepartments(response.data);
            } catch (err) {
                console.error('Failed to fetch departments', err);
            }
        };
        fetchDepartments();
    }, [token]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDeptDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== 'application/pdf' && selectedFile.type !== 'text/plain') {
                setError('Please upload a PDF or Text file.');
                return;
            }
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file || !selectedDepartment || !postAssessmentDate) {
            setError('Please fill in all fields and select a file.');
            return;
        }

        setUploading(true);
        setError(null);
        setProgress(10);

        try {
            // 1. Get Upload URL
            if (!user?.id || !token) {
                throw new Error('User not authenticated');
            }

            const { data: { uploadUrl, key } } = await axios.post(`${API_BASE_URL}/api/assessments/upload-url`, {
                fileName: file.name,
                contentType: file.type,
                userId: user.id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setProgress(40);

            // 2. Upload to S3 (using fetch to avoid axios default headers interfering)
            const s3Response = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file
            });

            if (!s3Response.ok) {
                throw new Error(`S3 upload failed: ${s3Response.status} ${s3Response.statusText}`);
            }

            setProgress(70);
            setUploading(false);
            setProcessing(true);

            // 3. Process File
            const { data: { scenario } } = await axios.post(`${API_BASE_URL}/api/assessments/process`, {
                key,
                userId: user.id,
                departmentId: selectedDepartment,
                postAssessmentDate: new Date(postAssessmentDate).toISOString()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setProgress(100);
            setProcessing(false);
            onUploadComplete(scenario);

        } catch (err: any) {
            console.error('Upload failed:', err);
            setError(err.response?.data?.message || err.message || 'Upload failed');
            setUploading(false);
            setProcessing(false);
        }
    };

    const selectedDeptName = departments.find(d => d.id === selectedDepartment)?.name || 'Select Department';

    return (
        <div className="bg-[#111] p-6 rounded-xl border border-white/5 space-y-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 tracking-wider">
                <Upload className="w-5 h-5 text-cyan-400" />
                UPLOAD TRAINING MATERIAL
            </h3>

            {/* Notion-style Toggle for Department */}
            <div className="relative" ref={dropdownRef}>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider flex items-center gap-2">
                    <Building className="w-3 h-3" />
                    Target Department
                </label>

                <div
                    onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                    className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-between group"
                >
                    <div className="flex items-center gap-2">
                        {isDeptDropdownOpen ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                        <span className={!selectedDepartment ? 'text-gray-500' : 'text-white'}>
                            {selectedDeptName}
                        </span>
                    </div>
                </div>

                {isDeptDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                        {departments.map(dept => (
                            <div
                                key={dept.id}
                                onClick={() => {
                                    setSelectedDepartment(dept.id);
                                    setIsDeptDropdownOpen(false);
                                }}
                                className="px-4 py-2.5 hover:bg-white/5 cursor-pointer flex items-center justify-between group transition-colors"
                            >
                                <span className="text-gray-300 group-hover:text-white transition-colors">{dept.name}</span>
                                {selectedDepartment === dept.id && (
                                    <Check className="w-4 h-4 text-cyan-400" />
                                )}
                            </div>
                        ))}
                        {departments.length === 0 && (
                            <div className="px-4 py-3 text-gray-500 text-sm italic">
                                No departments found
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Date Selection */}
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    Post-Assessment Date
                </label>
                <input
                    type="datetime-local"
                    value={postAssessmentDate}
                    onChange={(e) => setPostAssessmentDate(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 [color-scheme:dark]"
                />
            </div>

            {/* File Upload */}
            <div className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center hover:border-cyan-500/50 transition-colors group">
                <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".pdf,.txt"
                    onChange={handleFileChange}
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <FileText className="w-12 h-12 text-gray-600 group-hover:text-cyan-400 transition-colors" />
                    <span className="text-gray-300 font-medium group-hover:text-white transition-colors">
                        {file ? file.name : 'Click to upload PDF or Text file'}
                    </span>
                    <span className="text-gray-600 text-sm">
                        Max size: 10MB
                    </span>
                </label>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {(uploading || processing) && (
                <div className="mt-4">
                    <div className="flex justify-between text-xs text-cyan-400 mb-1 font-mono">
                        <span>{uploading ? 'UPLOADING...' : 'PROCESSING_WITH_AI...'}</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1">
                        <div
                            className="bg-cyan-500 h-1 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            <button
                onClick={handleUpload}
                disabled={!file || !selectedDepartment || !postAssessmentDate || uploading || processing}
                className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all tracking-wider
                    ${!file || !selectedDepartment || !postAssessmentDate || uploading || processing
                        ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                    }`}
            >
                {processing ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        GENERATING ASSESSMENT...
                    </>
                ) : (
                    <>
                        <Upload className="w-5 h-5" />
                        UPLOAD & GENERATE
                    </>
                )}
            </button>
        </div>
    );
};

export default AssessmentUploader;
