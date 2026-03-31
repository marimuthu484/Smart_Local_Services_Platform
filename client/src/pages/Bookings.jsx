import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ChatBubbleLeftEllipsisIcon, MapPinIcon, XCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const Bookings = () => {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [cancelModal, setCancelModal] = useState({ isOpen: false, bookingId: null, reason: '' });

    const fetchBookings = async () => {
        try {
            const res = await api.get('/bookings');
            setBookings(res.data.bookings);
        } catch (err) {
            console.error('Failed to fetch bookings', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const updateStatus = async (id, status, extraData = {}) => {
        try {
            await api.patch(`/bookings/${id}/status`, { status, ...extraData });
            // Refresh local state
            setBookings(bookings.map(b => b._id === id ? { ...b, status } : b));
            if (status === 'cancelled') {
                setCancelModal({ isOpen: false, bookingId: null, reason: '' });
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update status');
        }
    };

    const filteredBookings = activeTab === 'all'
        ? bookings
        : bookings.filter(b => b.status === activeTab);

    if (loading) return (
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        </div>
    );

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">
                        {user.role === 'customer' ? 'My Bookings' : 'Booking Requests'}
                    </h1>
                    <p className="mt-1 text-slate-400">
                        Manage your service reservations and appointments
                    </p>
                </div>

                {/* Filters */}
                <div className="flex overflow-x-auto rounded-lg bg-slate-800/80 p-1 custom-scrollbar">
                    {['all', 'pending', 'accepted', 'in-progress', 'completed', 'cancelled'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab
                                ? 'bg-indigo-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {filteredBookings.length === 0 ? (
                <div className="glass-card flex flex-col items-center justify-center p-12 text-center">
                    <div className="mb-4 rounded-full bg-slate-800 p-4">
                        <CheckCircleIcon className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">No bookings found</h3>
                    <p className="mt-2 text-slate-400">
                        {activeTab === 'all'
                            ? "You haven't made any bookings yet."
                            : `You have no ${activeTab} bookings.`}
                    </p>
                    {user.role === 'customer' && (
                        <Link to="/search" className="btn-primary mt-6 px-6 py-2">
                            Find Services
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {filteredBookings.map((booking) => (
                        <div key={booking._id} className="glass-card p-6 transition-all hover:bg-slate-800/40">
                            <div className="flex flex-col gap-6 md:flex-row">

                                {/* Image & Main Info */}
                                <div className="flex flex-1 gap-4">
                                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-700">
                                        {booking.service?.images?.[0] ? (
                                            <img src={booking.service.images[0]} alt={booking.service.title} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-indigo-900 font-bold text-xl text-indigo-300">
                                                {booking.service?.title?.charAt(0) || 'S'}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col justify-center">
                                        <span className={`badge badge-${booking.status} w-fit mb-2`}>{booking.status}</span>
                                        <h3 className="text-xl font-bold text-white mb-1">
                                            {booking.service?.title || 'Unknown Service'}
                                        </h3>
                                        <p className="text-sm text-slate-400 flex items-center gap-1">
                                            {user.role === 'customer' ? (
                                                <>Provider: <span className="text-slate-300 font-medium">{booking.provider?.name || 'Unknown Provider'}</span></>
                                            ) : (
                                                <>Customer: <span className="text-slate-300 font-medium">{booking.customer?.name || 'Unknown Customer'}</span></>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Date & Location */}
                                <div className="flex flex-col justify-center gap-2 border-l-0 border-t border-slate-700 pt-4 md:w-64 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                                    <div className="text-sm">
                                        <span className="block text-slate-400">Date & Time</span>
                                        <span className="font-medium text-white">
                                            {new Date(booking.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="text-indigo-300 ml-2">{booking.timeSlot.start} - {booking.timeSlot.end}</span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="block text-slate-400">Location</span>
                                        <div className="flex items-center gap-1 text-white">
                                            <MapPinIcon className="h-4 w-4 text-indigo-400" />
                                            <span className="truncate">{booking.customerAddress || 'Provider Location'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions & Price */}
                                <div className="flex flex-col items-end justify-between border-l-0 border-t border-slate-700 pt-4 md:w-48 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                                    <div className="text-right w-full">
                                        <span className="block text-xs text-slate-400 uppercase tracking-widest">Total</span>
                                        <span className="text-2xl font-bold text-white">${booking.totalAmount}</span>
                                    </div>

                                    <div className="mt-4 flex w-full flex-col gap-2">
                                        {/* Chat Action */}
                                        <Link
                                            to={`/chat/${booking._id}`}
                                            className="flex items-center justify-center gap-2 rounded-lg bg-slate-700 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
                                        >
                                            <ChatBubbleLeftEllipsisIcon className="h-4 w-4" /> Chat
                                        </Link>

                                        {/* Status Actions based on Role */}
                                        {user.role === 'provider' && booking.status === 'pending' && (
                                            <div className="flex gap-2">
                                                <button onClick={() => updateStatus(booking._id, 'accepted')} className="btn-success flex-1 py-2 text-xs">Accept</button>
                                                <button onClick={() => updateStatus(booking._id, 'rejected')} className="btn-danger flex-1 py-2 text-xs">Reject</button>
                                            </div>
                                        )}

                                        {user.role === 'provider' && booking.status === 'accepted' && (
                                            <button onClick={() => updateStatus(booking._id, 'in-progress')} className="btn-primary py-2 text-sm w-full">Start Service</button>
                                        )}

                                        {user.role === 'provider' && booking.status === 'in-progress' && (
                                            <button onClick={() => updateStatus(booking._id, 'completed')} className="btn-success py-2 text-sm w-full">Mark Complete</button>
                                        )}

                                        {/* Customer cancel option */}
                                        {user.role === 'customer' && ['pending', 'accepted'].includes(booking.status) && (
                                            <button onClick={() => setCancelModal({ isOpen: true, bookingId: booking._id, reason: '' })} className="flex items-center justify-center gap-1 py-1.5 text-xs text-red-400 hover:text-red-300 w-full transition border border-red-500/20 rounded-md">
                                                <XCircleIcon className="h-4 w-4" /> Cancel Booking
                                            </button>
                                        )}

                                        {/* Customer Review Option */}
                                        {user.role === 'customer' && booking.status === 'completed' && (
                                            <>
                                                <Link to={`/payment/${booking._id}`} className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 w-full">
                                                    💳 Pay Now
                                                </Link>
                                                <Link to={`/review/${booking._id}`} className="btn-primary py-2 text-sm text-center w-full">Leave Review</Link>
                                            </>
                                        )}

                                        {/* Tracking Action */}
                                        {['accepted', 'in-progress'].includes(booking.status) && (
                                            <Link
                                                to={`/tracking/${booking._id}`}
                                                className="flex items-center justify-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 py-2 text-sm font-medium text-indigo-300 transition hover:bg-indigo-500/20"
                                            >
                                                <MapPinIcon className="h-4 w-4" /> Live Tracking
                                            </Link>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Cancellation Modal */}
            {cancelModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="glass-card w-full max-w-md p-6 transform transition-all animate-slide-up">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Cancel Booking</h3>
                            <button onClick={() => setCancelModal({ isOpen: false, bookingId: null, reason: '' })} className="text-slate-400 hover:text-white transition-colors">
                                <XCircleIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm text-slate-300">
                                Please provide a reason for cancelling this booking. This helps our providers improve their services.
                            </p>

                            <textarea
                                className="input-field w-full min-h-[100px] resize-none"
                                placeholder="E.g., Schedule conflict, Found another service, etc."
                                value={cancelModal.reason}
                                onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                            />

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setCancelModal({ isOpen: false, bookingId: null, reason: '' })}
                                    className="flex-1 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition"
                                >
                                    Keep Booking
                                </button>
                                <button
                                    onClick={() => updateStatus(cancelModal.bookingId, 'cancelled', { cancellationReason: cancelModal.reason })}
                                    disabled={!cancelModal.reason.trim()}
                                    className="flex-1 btn-danger py-2 text-sm flex items-center justify-center gap-2"
                                >
                                    Confirm Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Bookings;
