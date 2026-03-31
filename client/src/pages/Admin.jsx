import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { UsersIcon, ChartBarIcon, CurrencyDollarIcon, StarIcon, CheckCircleIcon, XCircleIcon, DocumentTextIcon, LockClosedIcon, LockOpenIcon, CalendarDaysIcon, TrashIcon } from '@heroicons/react/24/outline';

const Admin = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('analytics');
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [bookings, setBookings] = useState([]);
    const [bookingsLoading, setBookingsLoading] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [verificationModal, setVerificationModal] = useState({ isOpen: false, provider: null, status: '', reason: '' });

    const fetchAnalytics = async () => {
        try {
            const res = await api.get('/admin/analytics');
            setStats(res.data.analytics);
        } catch (err) {
            console.error('Failed to fetch analytics', err);
        } finally { setLoading(false); }
    };

    const fetchUsers = async () => {
        setUsersLoading(true);
        try {
            const res = await api.get('/admin/users?limit=50');
            setUsers(res.data.users);
        } catch (err) { console.error(err); }
        finally { setUsersLoading(false); }
    };

    const fetchBookings = async () => {
        setBookingsLoading(true);
        try {
            const res = await api.get('/admin/bookings?limit=50');
            setBookings(res.data.bookings);
        } catch (err) { console.error(err); }
        finally { setBookingsLoading(false); }
    };

    const fetchReviews = async () => {
        setReviewsLoading(true);
        try {
            const res = await api.get('/admin/reviews?limit=50');
            setReviews(res.data.reviews);
        } catch (err) { console.error(err); }
        finally { setReviewsLoading(false); }
    };

    useEffect(() => {
        if (activeTab === 'analytics' && !stats) fetchAnalytics();
        else if (activeTab === 'users' && users.length === 0) fetchUsers();
        else if (activeTab === 'bookings' && bookings.length === 0) fetchBookings();
        else if (activeTab === 'reviews' && reviews.length === 0) fetchReviews();
    }, [activeTab]);

    const toggleBlock = async (userId, currentStatus) => {
        if (!window.confirm(`${currentStatus ? 'Unblock' : 'Block'} this user?`)) return;
        try {
            await api.patch(`/admin/users/${userId}/block`);
            setUsers(users.map(u => u._id === userId ? { ...u, isBlocked: !u.isBlocked } : u));
        } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    };

    const deleteAccount = async (userId, email) => {
        if (!window.confirm(`PERMANENTLY delete account "${email}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/admin/users/${userId}`);
            setUsers(users.filter(u => u._id !== userId));
        } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    };

    const handleVerification = async (e) => {
        e.preventDefault();
        try {
            await api.patch(`/admin/providers/${verificationModal.provider._id}/verify`, {
                status: verificationModal.status,
                rejectionReason: verificationModal.reason
            });
            setUsers(users.map(u => u._id === verificationModal.provider._id
                ? { ...u, verificationStatus: verificationModal.status, isVerifiedProvider: verificationModal.status === 'approved' }
                : u
            ));
            setVerificationModal({ isOpen: false, provider: null, status: '', reason: '' });
        } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    };

    const deleteReview = async (reviewId) => {
        if (!window.confirm('Delete this review? Provider rating will be recalculated.')) return;
        try {
            await api.delete(`/admin/reviews/${reviewId}`);
            setReviews(reviews.filter(r => r._id !== reviewId));
        } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    };

    if (loading) return (
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
    );

    const tabs = ['analytics', 'users', 'bookings', 'reviews'];

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                    <p className="mt-1 text-slate-400">Platform management & commission tracking</p>
                </div>
                <div className="flex bg-slate-800/80 p-1 rounded-lg self-start flex-wrap gap-1">
                    {tabs.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition capitalize ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                            {tab === 'users' ? 'Users' : tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* ═══════════ ANALYTICS ═══════════ */}
            {activeTab === 'analytics' && stats && (
                <div className="space-y-6">
                    {/* Row 1: Core KPIs */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="glass-card p-6 border-b-4 border-indigo-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Total Users</h3>
                                    <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
                                </div>
                                <div className="rounded-lg bg-indigo-500/10 p-3 text-indigo-400"><UsersIcon className="h-6 w-6" /></div>
                            </div>
                            <div className="mt-4 flex gap-4 text-xs text-slate-400">
                                <span>{stats.totalProviders} Providers</span>
                                <span>{stats.totalCustomers} Customers</span>
                            </div>
                        </div>

                        <div className="glass-card p-6 border-b-4 border-emerald-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Total Revenue</h3>
                                    <p className="text-3xl font-bold text-white">₹{stats.totalRevenue?.toLocaleString() || 0}</p>
                                </div>
                                <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-400"><CurrencyDollarIcon className="h-6 w-6" /></div>
                            </div>
                            <div className="mt-4 text-xs text-emerald-400 font-medium">
                                {stats.completedBookings} completed bookings
                            </div>
                        </div>

                        <div className="glass-card p-6 border-b-4 border-amber-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Admin Commission</h3>
                                    <p className="text-3xl font-bold text-white">₹{stats.totalCommission?.toLocaleString() || 0}</p>
                                </div>
                                <div className="rounded-lg bg-amber-500/10 p-3 text-amber-400"><CurrencyDollarIcon className="h-6 w-6" /></div>
                            </div>
                            <div className="mt-4 text-xs text-red-400 font-medium">
                                ₹{stats.unpaidCommission?.toLocaleString() || 0} unpaid
                            </div>
                        </div>

                        <div className="glass-card p-6 border-b-4 border-blue-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Active Bookings</h3>
                                    <p className="text-3xl font-bold text-white">{stats.activeBookings}</p>
                                </div>
                                <div className="rounded-lg bg-blue-500/10 p-3 text-blue-400"><CalendarDaysIcon className="h-6 w-6" /></div>
                            </div>
                            <div className="mt-4 text-xs text-slate-400">{stats.totalBookings} total</div>
                        </div>
                    </div>

                    {/* Row 2: Cancellation + Provider Earnings + DAU */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                        <div className="glass-card p-6 border-l-4 border-red-500">
                            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Cancellation Rate</h3>
                            <p className="text-3xl font-bold text-white">{stats.cancellationRate}%</p>
                            <p className="text-xs text-slate-400 mt-2">{stats.cancelledBookings} cancelled</p>
                        </div>
                        <div className="glass-card p-6 border-l-4 border-pink-500">
                            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Provider Payouts</h3>
                            <p className="text-3xl font-bold text-white">₹{stats.totalProviderEarnings?.toLocaleString() || 0}</p>
                            <p className="text-xs text-slate-400 mt-2">Net after 10% commission</p>
                        </div>
                        <div className="glass-card p-6 border-l-4 border-purple-500">
                            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Daily Active Users</h3>
                            <p className="text-3xl font-bold text-white">{stats.dailyActiveUsers}</p>
                            <p className="text-xs text-slate-400 mt-2">Last 24 hours</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Bookings by Status */}
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-bold text-white mb-6">Bookings by Status</h3>
                            <div className="space-y-4">
                                {stats.bookingsByStatus?.map(s => (
                                    <div key={s._id} className="flex items-center justify-between">
                                        <span className={`badge badge-${s._id} w-32 justify-center`}>{s._id}</span>
                                        <div className="flex-1 mx-4 h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full"
                                                style={{ width: `${stats.totalBookings > 0 ? (s.count / stats.totalBookings) * 100 : 0}%` }} />
                                        </div>
                                        <span className="text-white font-medium w-8 text-right">{s.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Providers */}
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-bold text-white mb-6">Top Providers</h3>
                            <div className="space-y-3">
                                {stats.topProviders?.length > 0 ? stats.topProviders.map((p, idx) => (
                                    <div key={p._id} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-500 font-bold w-5">{idx + 1}.</span>
                                            <div>
                                                <p className="text-sm font-medium text-white">{p.name}</p>
                                                <p className="text-xs text-slate-500">{p.completedJobs} jobs · {p.averageRating?.toFixed(1) || 0} ★</p>
                                            </div>
                                        </div>
                                        <p className="text-sm font-bold text-emerald-400">₹{p.totalEarnings?.toLocaleString() || 0}</p>
                                    </div>
                                )) : <div className="text-slate-400 text-center py-4">No data yet</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ USERS TAB ═══════════ */}
            {activeTab === 'users' && (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400">
                                <tr>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Verification</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usersLoading ? (
                                    <tr><td colSpan="5" className="text-center py-8">Loading...</td></tr>
                                ) : users.map(u => (
                                    <tr key={u._id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{u.name}</div>
                                            <div className="text-xs text-slate-500">{u.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`badge ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : u.role === 'provider' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`badge ${u.isBlocked ? 'badge-cancelled' : 'badge-completed'}`}>
                                                {u.isBlocked ? 'Blocked' : 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.role === 'provider' ? (
                                                <div className="flex items-center gap-2">
                                                    <span className={`badge ${u.verificationStatus === 'approved' ? 'badge-completed' : u.verificationStatus === 'rejected' ? 'badge-cancelled' : 'badge-pending'}`}>
                                                        {u.verificationStatus}
                                                    </span>
                                                    {u.documents?.length > 0 && (
                                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                                            <DocumentTextIcon className="h-3 w-3" /> {u.documents.length}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : <span className="text-slate-600">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                            {u.role === 'provider' && u.verificationStatus === 'pending' && (
                                                <button onClick={() => setVerificationModal({ isOpen: true, provider: u, status: 'approved', reason: '' })}
                                                    className="btn-primary py-1 px-3 text-xs">Review</button>
                                            )}
                                            {u._id !== user.id && u.role !== 'admin' && (
                                                <>
                                                    <button onClick={() => toggleBlock(u._id, u.isBlocked)}
                                                        className="text-slate-400 hover:text-white transition p-1"
                                                        title={u.isBlocked ? "Unblock" : "Block"}>
                                                        {u.isBlocked ? <LockOpenIcon className="h-5 w-5 text-emerald-500" /> : <LockClosedIcon className="h-5 w-5 text-red-500" />}
                                                    </button>
                                                    <button onClick={() => deleteAccount(u._id, u.email)}
                                                        className="text-slate-400 hover:text-red-500 transition p-1"
                                                        title="Delete Account">
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════ BOOKINGS TAB ═══════════ */}
            {activeTab === 'bookings' && (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400">
                                <tr>
                                    <th className="px-6 py-4">Service</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Provider</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Commission</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Payment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookingsLoading ? (
                                    <tr><td colSpan="7" className="text-center py-8">Loading...</td></tr>
                                ) : bookings.length > 0 ? bookings.map(b => (
                                    <tr key={b._id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{b.service?.title || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-white">{b.customer?.name}</td>
                                        <td className="px-6 py-4 text-white">{b.provider?.name}</td>
                                        <td className="px-6 py-4 text-white font-medium">₹{b.totalAmount}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-amber-400 font-medium">₹{b.commissionAmount || 0}</span>
                                            {b.status === 'completed' && (
                                                <span className={`ml-2 text-xs ${b.commissionPaid ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {b.commissionPaid ? '✓ Paid' : '⏳ Due'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4"><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs capitalize ${b.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                {b.paymentMethod || '-'} / {b.paymentStatus || '-'}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="7" className="text-center py-8 text-slate-500">No bookings</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════ REVIEWS TAB ═══════════ */}
            {activeTab === 'reviews' && (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400">
                                <tr>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Provider</th>
                                    <th className="px-6 py-4">Service</th>
                                    <th className="px-6 py-4">Rating</th>
                                    <th className="px-6 py-4">Comment</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reviewsLoading ? (
                                    <tr><td colSpan="6" className="text-center py-8">Loading...</td></tr>
                                ) : reviews.length > 0 ? reviews.map(r => (
                                    <tr key={r._id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                                        <td className="px-6 py-4">
                                            <div className="text-white">{r.customer?.name}</div>
                                            <div className="text-xs text-slate-500">{r.customer?.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-white">{r.provider?.name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-white">{r.service?.title}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-amber-400 font-bold">{r.rating}/5 ★</span>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs truncate text-slate-400">{r.comment || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => deleteReview(r._id)}
                                                className="text-red-400 hover:text-red-300 transition p-1" title="Delete Review">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="6" className="text-center py-8 text-slate-500">No reviews</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════ VERIFICATION MODAL ═══════════ */}
            {verificationModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="glass-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Verify: {verificationModal.provider.name}</h3>
                            <button onClick={() => setVerificationModal({ isOpen: false, provider: null, status: '', reason: '' })} className="text-slate-400 hover:text-white">
                                <XCircleIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-800/60 rounded-lg p-4 space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-slate-400">Email:</span><span className="text-white">{verificationModal.provider.email}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Phone:</span><span className="text-white">{verificationModal.provider.phone || '-'}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">DOB:</span><span className="text-white">{verificationModal.provider.dateOfBirth ? new Date(verificationModal.provider.dateOfBirth).toLocaleDateString() : '-'}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Education:</span><span className="text-white">{verificationModal.provider.educationQualification || '-'}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Category:</span><span className="text-white capitalize">{verificationModal.provider.workCategory || '-'}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Experience:</span><span className="text-white">{verificationModal.provider.workExperience || '-'}</span></div>
                                {verificationModal.provider.workDetails && (
                                    <div className="pt-2 border-t border-slate-700">
                                        <span className="text-slate-400 block mb-1">Work Details:</span>
                                        <span className="text-white text-xs">{verificationModal.provider.workDetails}</span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 className="text-sm font-medium text-slate-300 mb-2">Documents (Preview & Download)</h4>
                                {verificationModal.provider.documents?.length > 0 ? (
                                    <div className="grid gap-2">
                                        {verificationModal.provider.documents.map((doc, idx) => (
                                            <a key={idx} href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${doc}`}
                                                target="_blank" rel="noreferrer"
                                                className="flex items-center gap-2 bg-slate-800 p-3 rounded-lg border border-slate-700 hover:border-indigo-500 transition text-indigo-400 text-sm">
                                                <DocumentTextIcon className="h-5 w-5" /> View/Download Document {idx + 1}
                                            </a>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-slate-500">No documents submitted.</p>}
                            </div>

                            <form onSubmit={handleVerification} className="space-y-4 pt-4 border-t border-slate-700">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Decision</label>
                                    <div className="flex gap-4">
                                        <label className={`flex-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition ${verificationModal.status === 'approved' ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                                            <input type="radio" name="status" value="approved" checked={verificationModal.status === 'approved'} onChange={(e) => setVerificationModal({ ...verificationModal, status: e.target.value })} className="sr-only" />
                                            <CheckCircleIcon className="h-5 w-5" /> Approve
                                        </label>
                                        <label className={`flex-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition ${verificationModal.status === 'rejected' ? 'border-red-500 bg-red-500/20 text-red-400' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                                            <input type="radio" name="status" value="rejected" checked={verificationModal.status === 'rejected'} onChange={(e) => setVerificationModal({ ...verificationModal, status: e.target.value })} className="sr-only" />
                                            <XCircleIcon className="h-5 w-5" /> Reject
                                        </label>
                                    </div>
                                </div>
                                {verificationModal.status === 'rejected' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Rejection Reason</label>
                                        <textarea required className="input-field w-full min-h-[100px]" placeholder="Explain why..."
                                            value={verificationModal.reason} onChange={(e) => setVerificationModal({ ...verificationModal, reason: e.target.value })} />
                                    </div>
                                )}
                                <button type="submit" disabled={!verificationModal.status} className="btn-primary w-full py-2">Submit Decision</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
