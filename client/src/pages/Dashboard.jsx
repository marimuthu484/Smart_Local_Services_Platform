import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Dashboard = () => {
    const { user } = useAuth();
    const [bookingStats, setBookingStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/bookings?limit=100');
                const bookings = res.data.bookings || [];
                const pending = bookings.filter(b => b.status === 'pending').length;
                const inProgress = bookings.filter(b => b.status === 'in-progress' || b.status === 'accepted').length;
                const completed = bookings.filter(b => b.status === 'completed').length;
                setBookingStats({ pending, inProgress, completed, total: bookings.length });
            } catch (err) {
                console.error('Failed to fetch stats', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return (
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        </div>
    );

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <p className="mt-1 text-slate-400">Welcome back, {user.name}!</p>
            </div>

            {/* === CUSTOMER DASHBOARD === */}
            {user.role === 'customer' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <div className="glass-card p-6 border-l-4 border-indigo-500">
                            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Active Bookings</h3>
                            <p className="text-4xl font-bold text-white">{bookingStats?.inProgress || 0}</p>
                            <Link to="/bookings" className="text-indigo-400 text-sm mt-4 inline-block hover:underline">View tracking &gt;</Link>
                        </div>
                        <div className="glass-card p-6 border-l-4 border-emerald-500">
                            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Completed Services</h3>
                            <p className="text-4xl font-bold text-white">{bookingStats?.completed || 0}</p>
                            <Link to="/bookings" className="text-emerald-400 text-sm mt-4 inline-block hover:underline">Leave reviews &gt;</Link>
                        </div>
                        <div className="glass-card p-6 col-span-1 md:col-span-2 lg:col-span-1 border-l-4 border-pink-500 bg-gradient-to-br from-slate-900 to-indigo-900/40">
                            <h3 className="text-white text-lg font-bold mb-2">Need a service?</h3>
                            <p className="text-slate-300 text-sm mb-4">Find top-rated professionals in your area instantly.</p>
                            <Link to="/search" className="btn-primary py-2 px-4 text-sm w-full text-center inline-block">Search Now</Link>
                        </div>
                    </div>
                </div>
            )}

            {/* === PROVIDER DASHBOARD === */}
            {user.role === 'provider' && (
                <div className="space-y-6">
                    {/* Unverified Provider Alert */}
                    {!user.isVerifiedProvider && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
                            <h3 className="text-amber-400 font-bold mb-1">Account Verification Required</h3>
                            <p className="text-sm text-slate-300 mb-3">
                                You must submit your professional documents before you can list public services or accept bookings.
                            </p>
                            <Link to="/verify-provider" className="inline-block rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-amber-400">
                                Upload Documents
                            </Link>
                        </div>
                    )}

                    {/* Stats with REAL data */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="glass-card p-6 border-b-4 border-emerald-500">
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Earnings</h3>
                            <p className="text-3xl font-bold text-white">${user.totalEarnings?.toLocaleString() || 0}</p>
                            <p className="text-xs text-slate-500 mt-2">Lifetime revenue</p>
                        </div>
                        <div className="glass-card p-6 border-b-4 border-indigo-500">
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Completed Jobs</h3>
                            <p className="text-3xl font-bold text-white">{user.completedJobs || 0}</p>
                            <p className="text-xs text-slate-500 mt-2">Successfully delivered</p>
                        </div>
                        <div className="glass-card p-6 border-b-4 border-blue-500">
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Pending Requests</h3>
                            <p className="text-3xl font-bold text-white">{bookingStats?.pending || 0}</p>
                            <p className="text-xs text-slate-500 mt-2">Awaiting your action</p>
                        </div>
                        <div className="glass-card p-6 border-b-4 border-amber-500">
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Average Rating</h3>
                            <div className="flex items-end gap-2">
                                <p className="text-3xl font-bold text-white">{user.averageRating?.toFixed(1) || 'N/A'}</p>
                                <span className="text-amber-400 text-sm mb-1 pb-1">★</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">{user.totalReviews || 0} reviews</p>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        <div className="glass-card p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Link to="/my-services" className="col-span-2 md:col-span-1 rounded-xl bg-slate-800 p-4 border border-slate-700 hover:border-indigo-500/50 transition flex flex-col items-center justify-center gap-3 group">
                                    <div className="h-12 w-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition">
                                        <span className="text-2xl">+</span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-300">Create Listing</span>
                                </Link>
                                <Link to="/bookings" className="col-span-2 md:col-span-1 rounded-xl bg-slate-800 p-4 border border-slate-700 hover:border-emerald-500/50 transition flex flex-col items-center justify-center gap-3 group">
                                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition">
                                        <span className="text-2xl">✓</span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-300">Manage Bookings</span>
                                </Link>
                            </div>
                        </div>

                        <div className="glass-card p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white">Overview</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                    <span className="text-sm text-slate-300">In Progress</span>
                                    <span className="text-sm font-bold text-blue-400">{bookingStats?.inProgress || 0}</span>
                                </div>
                                <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                    <span className="text-sm text-slate-300">Total Bookings</span>
                                    <span className="text-sm font-bold text-slate-300">{bookingStats?.total || 0}</span>
                                </div>
                                <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                    <span className="text-sm text-slate-300">Verification Status</span>
                                    <span className={`badge text-xs ${user.verificationStatus === 'approved' ? 'badge-completed' : user.verificationStatus === 'rejected' ? 'badge-cancelled' : 'badge-pending'}`}>
                                        {user.verificationStatus || 'pending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
