import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
    const { user } = useAuth();

    // If logged in, show a simple redirect prompt
    if (user) {
        const dashPath = user.role === 'admin' ? '/admin' : '/dashboard';
        return (
            <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
                <div className="glass-card animate-slide-in w-full max-w-md p-8 text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Welcome back, {user.name}!</h2>
                    <Link to={dashPath} className="btn-primary inline-block py-3 px-8 text-base">
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
            <div className="w-full max-w-3xl">
                {/* Hero */}
                <div className="text-center mb-12 animate-slide-in">
                    <div className="flex justify-center mb-6">
                        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                            <span className="text-4xl font-bold text-white">S</span>
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
                        Smart<span className="gradient-text">Local</span> Services
                    </h1>
                    <p className="text-lg text-slate-400 max-w-xl mx-auto">
                        Connect with top-rated local professionals. Book services, track in real-time, and manage everything from one platform.
                    </p>
                </div>

                {/* Auth Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Login Section */}
                    <div className="glass-card p-6 animate-slide-in" style={{ animationDelay: '100ms' }}>
                        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                            🔐 <span>Sign In</span>
                        </h2>
                        <p className="text-sm text-slate-400 mb-6">Login to your account</p>

                        <div className="space-y-3">
                            <Link
                                to="/login?role=customer"
                                className="flex items-center justify-center gap-3 w-full rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-6 py-3.5 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/20 hover:border-indigo-400/50 hover:shadow-lg hover:shadow-indigo-500/10"
                            >
                                <span className="text-lg">👤</span>
                                Login as Customer
                            </Link>

                            <Link
                                to="/login?role=provider"
                                className="flex items-center justify-center gap-3 w-full rounded-xl border border-pink-500/30 bg-pink-500/10 px-6 py-3.5 text-sm font-semibold text-pink-300 transition hover:bg-pink-500/20 hover:border-pink-400/50 hover:shadow-lg hover:shadow-pink-500/10"
                            >
                                <span className="text-lg">🛠</span>
                                Login as Service Provider
                            </Link>

                            <Link
                                to="/login?role=admin"
                                className="flex items-center justify-center gap-3 w-full rounded-xl border border-purple-500/30 bg-purple-500/10 px-6 py-3.5 text-sm font-semibold text-purple-300 transition hover:bg-purple-500/20 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10"
                            >
                                <span className="text-lg">🛡</span>
                                Login as Admin
                            </Link>
                        </div>
                    </div>

                    {/* Signup Section */}
                    <div className="glass-card p-6 animate-slide-in" style={{ animationDelay: '200ms' }}>
                        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                            📝 <span>Create Account</span>
                        </h2>
                        <p className="text-sm text-slate-400 mb-6">New to SmartLocal? Register now</p>

                        <div className="space-y-3">
                            <Link
                                to="/register?role=customer"
                                className="flex items-center justify-center gap-3 w-full rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-600/80 to-indigo-500/80 px-6 py-3.5 text-sm font-semibold text-white transition hover:from-indigo-600 hover:to-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20"
                            >
                                <span className="text-lg">👤</span>
                                Register as Customer
                            </Link>

                            <Link
                                to="/register?role=provider"
                                className="flex items-center justify-center gap-3 w-full rounded-xl border border-pink-500/30 bg-gradient-to-r from-pink-600/80 to-pink-500/80 px-6 py-3.5 text-sm font-semibold text-white transition hover:from-pink-600 hover:to-pink-500 hover:shadow-lg hover:shadow-pink-500/20"
                            >
                                <span className="text-lg">🛠</span>
                                Register as Service Provider
                            </Link>
                        </div>

                        <div className="mt-6 rounded-lg bg-slate-800/60 border border-slate-700 p-3">
                            <p className="text-xs text-slate-500 text-center">
                                ⚠ Admin accounts are created by the system administrator and cannot be registered publicly.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Feature highlights */}
                <div className="mt-12 grid grid-cols-3 gap-4 animate-slide-in" style={{ animationDelay: '300ms' }}>
                    <div className="text-center p-4">
                        <div className="text-3xl mb-2">📍</div>
                        <p className="text-xs font-medium text-slate-400">Nearest Provider Search</p>
                    </div>
                    <div className="text-center p-4">
                        <div className="text-3xl mb-2">📡</div>
                        <p className="text-xs font-medium text-slate-400">Real-Time Tracking</p>
                    </div>
                    <div className="text-center p-4">
                        <div className="text-3xl mb-2">⭐</div>
                        <p className="text-xs font-medium text-slate-400">Verified Reviews</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
