import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            const res = await api.post('/auth/forgotpassword', { email });
            setStatus({ type: 'success', message: res.data.message || 'If an account exists, a reset link has been sent.' });
            setEmail('');
        } catch (error) {
            setStatus({
                type: 'error',
                message: error.response?.data?.message || 'Something went wrong. Please try again.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
            <div className="glass-card w-full max-w-md p-8 animate-fade-in relative overflow-hidden">
                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl"></div>
                <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl"></div>

                <div className="relative text-center">
                    <h2 className="text-3xl font-extrabold text-white">
                        Reset <span className="gradient-text">Password</span>
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>

                <form className="relative mt-8 space-y-6" onSubmit={handleSubmit}>
                    {status.message && (
                        <div className={`rounded-xl p-4 text-sm font-medium ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                            {status.message}
                        </div>
                    )}

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                            Email address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="input-field mt-1"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !email}
                        className="btn-primary w-full flex justify-center"
                    >
                        {loading ? 'Sending Link...' : 'Send Reset Link'}
                    </button>

                    <p className="text-center text-sm text-slate-400">
                        Remember your password?{' '}
                        <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                            Sign in here
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default ForgotPassword;
