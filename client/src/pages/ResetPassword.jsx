import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const { resettoken } = useParams();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }

        if (password.length < 6) {
            return setError('Password must be at least 6 characters');
        }

        setLoading(true);

        try {
            await api.put(`/auth/resetpassword/${resettoken}`, { password });
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired token. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
            <div className="glass-card w-full max-w-md p-8 animate-slide-in relative overflow-hidden">
                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl"></div>

                <div className="relative text-center">
                    <h2 className="text-3xl font-extrabold text-white">
                        Create New <span className="gradient-text">Password</span>
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                        Please enter your new strong password below.
                    </p>
                </div>

                {success ? (
                    <div className="relative mt-8 text-center space-y-4">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 mb-4">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-lg font-medium text-emerald-400">Password Reset Successful!</p>
                        <p className="text-sm text-slate-400">Redirecting to login page...</p>
                        <Link to="/login" className="btn-primary block w-full mt-4">
                            Go to Login Now
                        </Link>
                    </div>
                ) : (
                    <form className="relative mt-8 space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 text-center font-medium">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    className="input-field mt-1"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    minLength="6"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    className="input-field mt-1"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={loading}
                                    minLength="6"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !password || !confirmPassword}
                            className="btn-primary w-full flex justify-center"
                        >
                            {loading ? 'Resetting Password...' : 'Reset Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
