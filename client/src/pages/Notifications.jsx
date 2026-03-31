import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { BellIcon, CheckCircleIcon, XCircleIcon, InformationCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

const Notifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data.notifications);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAsRead = async (id) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (err) {
            console.error('Failed to mark as read', err);
        }
    };

    const markAllRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error('Failed to mark all read', err);
        }
    };

    const deleteNotification = async (id) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(notifications.filter(n => n._id !== id));
        } catch (err) {
            console.error('Failed to delete notification', err);
        }
    };

    if (loading) return (
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        </div>
    );

    return (
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <BellIcon className="h-8 w-8 text-indigo-400" />
                        Notifications
                    </h1>
                    <p className="mt-1 text-slate-400">Stay updated on your booking activity</p>
                </div>
                {notifications.some(n => !n.isRead) && (
                    <button
                        onClick={markAllRead}
                        className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {notifications.length > 0 ? (
                    notifications.map((n) => (
                        <div
                            key={n._id}
                            className={`glass-card relative flex gap-4 p-4 transition-all duration-300 ${!n.isRead ? 'border-l-4 border-indigo-500 bg-indigo-500/5' : 'bg-slate-800/40 opacity-80'}`}
                        >
                            <div className={`mt-1 h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center ${n.type === 'booking' ? 'bg-blue-500/20 text-blue-400' :
                                    n.type === 'success' ? 'bg-green-500/20 text-green-400' :
                                        n.type === 'alert' ? 'bg-red-500/20 text-red-400' :
                                            'bg-slate-700/50 text-slate-400'
                                }`}>
                                {n.type === 'booking' ? <ClockIcon className="h-6 w-6" /> :
                                    n.type === 'success' ? <CheckCircleIcon className="h-6 w-6" /> :
                                        n.type === 'alert' ? <XCircleIcon className="h-6 w-6" /> :
                                            <InformationCircleIcon className="h-6 w-6" />}
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center justify-between gap-4">
                                    <h3 className={`font-bold ${!n.isRead ? 'text-white' : 'text-slate-300'}`}>{n.title}</h3>
                                    <span className="text-xs text-slate-500 whitespace-nowrap">
                                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-slate-400 leading-relaxed">{n.message}</p>

                                <div className="mt-3 flex items-center gap-4">
                                    {!n.isRead && (
                                        <button
                                            onClick={() => markAsRead(n._id)}
                                            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                                        >
                                            Mark as read
                                        </button>
                                    )}
                                    <button
                                        onClick={() => deleteNotification(n._id)}
                                        className="text-xs font-semibold text-red-400/70 hover:text-red-400"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="glass-card py-20 text-center">
                        <BellIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">All caught up!</h3>
                        <p className="text-slate-400">You have no new notifications.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
