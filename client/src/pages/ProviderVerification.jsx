import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { CloudArrowUpIcon, DocumentCheckIcon, ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const ProviderVerification = () => {
    const { user, login } = useAuth(); // login is not strictly needed here unless we refresh token, but we can just use setAuth
    const navigate = useNavigate();
    const [files, setFiles] = useState([]);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);

    // If they are already approved
    if (user?.isVerifiedProvider) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-4 text-center">
                <div className="glass-card max-w-md p-8">
                    <CheckCircleIcon className="mx-auto h-16 w-16 text-emerald-500 mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Account Verified</h2>
                    <p className="text-slate-400 mb-6">Your provider account has been fully verified. You can now list services and accept bookings.</p>
                    <button onClick={() => navigate('/dashboard')} className="btn-primary w-full py-2">Go to Dashboard</button>
                </div>
            </div>
        );
    }

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        const validFiles = selectedFiles.filter(file => file.type === 'application/pdf');

        if (validFiles.length !== selectedFiles.length) {
            setStatus({ type: 'error', message: 'Only PDF files are currently supported.' });
        } else if (validFiles.length > 5) {
            setStatus({ type: 'error', message: 'You can only upload up to 5 documents at a time.' });
        } else {
            setStatus({ type: '', message: '' });
            setFiles(validFiles);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (files.length === 0) return setStatus({ type: 'error', message: 'Please select at least one document.' });

        setLoading(true);
        setStatus({ type: '', message: '' });

        const formData = new FormData();
        files.forEach(file => {
            formData.append('documents', file);
        });

        try {
            await api.post('/auth/upload-documents', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setStatus({ type: 'success', message: 'Documents uploaded successfully! The team will review them shortly.' });
            setFiles([]);

            // Wait briefly before returning to dashboard
            setTimeout(() => navigate('/dashboard'), 3000);
        } catch (error) {
            setStatus({
                type: 'error',
                message: error.response?.data?.message || 'Failed to upload documents. Ensure they are PDFs under 5MB.'
            });
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-extrabold text-white">Provider Verification</h1>
                <p className="mt-2 text-sm text-slate-400">
                    Upload your professional licenses, certificates, or ID documents to get verified.
                </p>
            </div>

            <div className="glass-card overflow-hidden">
                {/* Status Banners */}
                {user?.verificationStatus === 'pending' && user?.documents?.length > 0 && !status.message && (
                    <div className="bg-amber-500/10 border-b border-amber-500/20 p-4">
                        <div className="flex items-center gap-3">
                            <ExclamationCircleIcon className="h-6 w-6 text-amber-500 shrink-0" />
                            <p className="text-sm text-amber-400 font-medium">
                                Your documents are currently under review by our admin team. You can upload additional documents if needed.
                            </p>
                        </div>
                    </div>
                )}

                {user?.verificationStatus === 'rejected' && (
                    <div className="bg-red-500/10 border-b border-red-500/20 p-4">
                        <div className="flex items-center gap-3">
                            <ExclamationCircleIcon className="h-6 w-6 text-red-500 shrink-0" />
                            <div>
                                <p className="text-sm text-red-400 font-bold mb-1">Verification Rejected</p>
                                <p className="text-sm text-red-300/80">{user?.rejectionReason || 'Your previous documents did not meet our guidelines. Please upload valid replacements.'}</p>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleUpload} className="p-6 sm:p-8">
                    {status.message && (
                        <div className={`mb-6 rounded-lg p-4 text-sm font-medium border ${status.type === 'success'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                            {status.message}
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-300 mb-4">
                            Upload Documents (PDF only, Max 5MB each)
                        </label>

                        <div className="group relative mt-1 flex justify-center rounded-xl border-2 border-dashed border-slate-600 px-6 py-12 transition-all hover:border-indigo-500 hover:bg-slate-800/50">
                            <div className="text-center">
                                <CloudArrowUpIcon className="mx-auto h-12 w-12 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                                <div className="mt-4 flex text-sm text-slate-300 justify-center">
                                    <label
                                        htmlFor="file-upload"
                                        className="relative cursor-pointer rounded-md font-semibold text-indigo-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-slate-900 hover:text-indigo-300"
                                    >
                                        <span>Click to browse files</span>
                                        <input
                                            id="file-upload"
                                            name="documents"
                                            type="file"
                                            multiple
                                            accept=".pdf"
                                            className="sr-only"
                                            onChange={handleFileChange}
                                            disabled={loading}
                                        />
                                    </label>
                                </div>
                                <p className="mt-2 text-xs text-slate-500">Up to 5 files maximum</p>
                            </div>
                        </div>
                    </div>

                    {files.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-sm font-medium text-slate-300 mb-3">Selected Files</h4>
                            <ul className="space-y-2">
                                {files.map((file, idx) => (
                                    <li key={idx} className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                        <DocumentCheckIcon className="h-5 w-5 text-emerald-500" />
                                        <span className="text-sm text-slate-300 truncate">{file.name}</span>
                                        <span className="text-xs text-slate-500 ml-auto">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || files.length === 0}
                        className="btn-primary w-full py-3 flex justify-center"
                    >
                        {loading ? 'Uploading Documents...' : 'Submit Documents for Verification'}
                    </button>

                    <div className="mt-6 border-t border-slate-700/50 pt-6">
                        <button type="button" onClick={() => navigate('/dashboard')} className="text-sm text-slate-400 hover:text-white transition w-full text-center">
                            Skip for now / Return to Dashboard
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProviderVerification;
