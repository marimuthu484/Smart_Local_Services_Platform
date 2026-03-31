import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_CONFIG = {
    customer: { label: 'Customer', icon: '👤', color: 'indigo', dashPath: '/dashboard' },
    provider: { label: 'Service Provider', icon: '🛠', color: 'pink', dashPath: '/dashboard' },
    admin: { label: 'Admin', icon: '🛡', color: 'purple', dashPath: '/admin' },
};

const Login = () => {
    const [searchParams] = useSearchParams();
    const preselectedRole = searchParams.get('role') || '';
    const [selectedRole, setSelectedRole] = useState(preselectedRole);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!selectedRole) {
            return setError('Please select your role to continue.');
        }

        setIsLoading(true);

        try {
            const data = await login(email, password);
            const user = data.user;

            // Verify the logged in user's role matches selected role
            if (user.role !== selectedRole) {
                setError(`This account is registered as "${user.role}", not "${selectedRole}". Please select the correct role.`);
                setIsLoading(false);
                return;
            }

            // Route to the correct dashboard
            const dashPath = from || ROLE_CONFIG[user.role]?.dashPath || '/dashboard';
            navigate(dashPath, { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    // If no role selected, show role selection
    if (!selectedRole) {
        return (
            <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
                <div className="glass-card animate-slide-in w-full max-w-md p-8">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold tracking-tight text-white">Sign In</h1>
                        <p className="mt-2 text-sm text-slate-400">Select your role to continue</p>
                    </div>

                    <div className="space-y-3">
                        {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                            <button
                                key={role}
                                onClick={() => setSelectedRole(role)}
                                className={`flex items-center justify-center gap-3 w-full rounded-xl border px-6 py-4 text-sm font-semibold transition hover:shadow-lg ${role === 'customer' ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:shadow-indigo-500/10' :
                                        role === 'provider' ? 'border-pink-500/30 bg-pink-500/10 text-pink-300 hover:bg-pink-500/20 hover:shadow-pink-500/10' :
                                            'border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:shadow-purple-500/10'
                                    }`}
                            >
                                <span className="text-lg">{config.icon}</span>
                                Login as {config.label}
                            </button>
                        ))}
                    </div>

                    <p className="mt-8 text-center text-sm text-slate-400">
                        Don't have an account?{' '}
                        <Link to="/" className="font-medium text-indigo-400 hover:text-indigo-300">Go to Home</Link>
                    </p>
                </div>
            </div>
        );
    }

    const cfg = ROLE_CONFIG[selectedRole];

    return (
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
            <div className="glass-card animate-slide-in w-full max-w-md p-8">
                <div className="mb-8 text-center">
                    <div className="mb-3 text-4xl">{cfg.icon}</div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">
                        {cfg.label} Login
                    </h1>
                    <button onClick={() => setSelectedRole('')} className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition">
                        ← Change role
                    </button>
                </div>

                {error && (
                    <div className="mb-6 rounded-lg bg-red-500/10 p-4 text-sm font-medium text-red-400 border border-red-500/20">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="email">Email Address</label>
                        <input id="email" type="email" required className="input-field"
                            placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="password">Password</label>
                        <input id="password" type="password" required className="input-field"
                            placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>

                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center">
                            <input id="remember-me" type="checkbox" className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500/50" />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-300">Remember me</label>
                        </div>
                        <Link to="/forgot-password" className="font-medium text-indigo-400 hover:text-indigo-300 text-sm">Forgot password?</Link>
                    </div>

                    <button type="submit" disabled={isLoading}
                        className="btn-primary w-full flex justify-center py-3 text-base">
                        {isLoading ? (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : `Sign In as ${cfg.label}`}
                    </button>
                </form>

                {selectedRole !== 'admin' && (
                    <p className="mt-8 text-center text-sm text-slate-400">
                        Don't have an account?{' '}
                        <Link to={`/register?role=${selectedRole}`} className="font-medium text-indigo-400 hover:text-indigo-300">
                            Register as {cfg.label}
                        </Link>
                    </p>
                )}
            </div>
        </div>
    );
};

export default Login;
