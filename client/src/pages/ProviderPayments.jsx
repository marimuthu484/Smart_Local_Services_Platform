import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const loadRazorpay = () => {
    return new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const statusBadge = (status) => {
    const map = {
        pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        cash_confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        failed: 'bg-red-500/10 text-red-400 border-red-500/30',
    };
    return map[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/30';
};

const ProviderPayments = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [processing, setProcessing] = useState({});
    const [messages, setMessages] = useState({});

    const fetchPayments = async () => {
        setFetchError('');
        setLoading(true);
        try {
            const res = await api.get('/payments/my');
            setPayments(res.data.payments || []);
        } catch (err) {
            setFetchError(err.response?.data?.message || 'Failed to load payments. Make sure you are logged in as a provider.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPayments(); }, []);

    const setMsg = (id, type, text) => setMessages(prev => ({ ...prev, [id]: { type, text } }));

    // Provider confirms cash received
    const handleConfirmCash = async (paymentId) => {
        if (!window.confirm('Are you sure you collected the full cash amount from the customer?')) return;
        setProcessing(prev => ({ ...prev, [paymentId]: true }));
        try {
            const res = await api.patch(`/payments/${paymentId}/confirm-cash`);
            const updated = res.data.payment;
            setMsg(paymentId, 'success', `✅ Cash confirmed! Your earning: ₹${updated.providerAmount}. Now pay the platform commission of ₹${updated.adminCommission}.`);
            setPayments(prev => prev.map(p => p._id === paymentId ? { ...p, paymentStatus: 'cash_confirmed' } : p));
        } catch (err) {
            setMsg(paymentId, 'error', err.response?.data?.message || 'Failed to confirm cash.');
        } finally {
            setProcessing(prev => ({ ...prev, [paymentId]: false }));
        }
    };

    // Provider pays commission to admin via Razorpay
    const handlePayCommission = async (payment) => {
        setProcessing(prev => ({ ...prev, [payment._id]: true }));
        const loaded = await loadRazorpay();
        if (!loaded) {
            setMsg(payment._id, 'error', 'Could not load Razorpay. Check your internet connection.');
            setProcessing(prev => ({ ...prev, [payment._id]: false }));
            return;
        }

        try {
            const orderRes = await api.post(`/payments/${payment._id}/create-commission-order`);
            const { order, keyId } = orderRes.data;

            if (!keyId || keyId.includes('REPLACE')) {
                setMsg(payment._id, 'error', 'Razorpay keys are not configured. Please add your keys to server/.env');
                setProcessing(prev => ({ ...prev, [payment._id]: false }));
                return;
            }

            const options = {
                key: keyId,
                amount: order.amount,
                currency: order.currency,
                name: 'SmartLocal — Platform Commission',
                description: `20% commission: ₹${payment.adminCommission}`,
                order_id: order.id,
                handler: async (response) => {
                    try {
                        await api.post(`/payments/${payment._id}/verify-commission`, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });
                        setMsg(payment._id, 'success', '✅ Commission paid! This booking is now fully settled.');
                        setPayments(prev => prev.map(p => p._id === payment._id ? { ...p, paymentStatus: 'completed' } : p));
                    } catch (err) {
                        setMsg(payment._id, 'error', 'Commission verification failed. Contact support.');
                    }
                    setProcessing(prev => ({ ...prev, [payment._id]: false }));
                },
                theme: { color: '#f59e0b' },
                modal: {
                    ondismiss: () => {
                        setMsg(payment._id, 'error', 'Payment was cancelled. Commission is still due.');
                        setProcessing(prev => ({ ...prev, [payment._id]: false }));
                    }
                }
            };

            new window.Razorpay(options).open();
        } catch (err) {
            setMsg(payment._id, 'error', err.response?.data?.message || 'Failed to create commission order.');
            setProcessing(prev => ({ ...prev, [payment._id]: false }));
        }
    };

    if (loading) return (
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
    );

    const pendingActions = payments.filter(p =>
        p.paymentMode === 'offline' && ['pending', 'cash_confirmed'].includes(p.paymentStatus)
    );

    return (
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">My Payments</h1>
                    <p className="mt-1 text-slate-400">Cash confirmations, commission payments, and payment history</p>
                </div>
                <button onClick={fetchPayments} className="btn-secondary py-2 px-4 text-sm">↻ Refresh</button>
            </div>

            {/* Fetch Error */}
            {fetchError && (
                <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-5 text-sm text-red-400">
                    <p className="font-medium mb-1">⚠ Could not load payments</p>
                    <p>{fetchError}</p>
                    <button onClick={fetchPayments} className="mt-3 text-xs underline">Try Again</button>
                </div>
            )}

            {/* ─── Pending Actions ─── */}
            {pendingActions.length > 0 && (
                <div className="mb-8">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-amber-400">
                        ⚠ Action Required ({pendingActions.length})
                    </h2>
                    <div className="space-y-4">
                        {pendingActions.map(p => (
                            <div key={p._id} className="glass-card border border-amber-500/30 p-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    {/* Info */}
                                    <div className="space-y-1 flex-1">
                                        <p className="font-bold text-white text-base">
                                            {p.booking?.service?.title || 'Service'}
                                        </p>
                                        <p className="text-sm text-slate-400">
                                            Customer: <span className="text-slate-300">{p.customer?.name || 'Unknown'}</span>
                                            {p.customer?.phone && <span className="ml-2 text-slate-500">({p.customer.phone})</span>}
                                        </p>
                                        <p className="text-sm text-slate-400">
                                            Date: <span className="text-slate-300">
                                                {p.booking?.date ? new Date(p.booking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                            </span>
                                        </p>
                                        <div className="flex gap-4 mt-2 text-sm">
                                            <span>Total: <span className="font-bold text-white">₹{p.totalAmount}</span></span>
                                            <span>Your share: <span className="font-bold text-emerald-400">₹{p.providerAmount}</span></span>
                                            <span>Commission due: <span className="font-bold text-amber-400">₹{p.adminCommission}</span></span>
                                        </div>
                                        <div className="mt-1">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border font-medium ${statusBadge(p.paymentStatus)}`}>
                                                {p.paymentStatus.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <div className="flex-shrink-0">
                                        {p.paymentStatus === 'pending' && (
                                            <button
                                                onClick={() => handleConfirmCash(p._id)}
                                                disabled={processing[p._id]}
                                                className="w-full sm:w-auto rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2.5 text-sm transition disabled:opacity-60">
                                                {processing[p._id] ? 'Confirming...' : '💵 Confirm Cash Received'}
                                            </button>
                                        )}
                                        {p.paymentStatus === 'cash_confirmed' && (
                                            <button
                                                onClick={() => handlePayCommission(p)}
                                                disabled={processing[p._id]}
                                                className="w-full sm:w-auto rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium px-5 py-2.5 text-sm transition disabled:opacity-60">
                                                {processing[p._id] ? 'Opening payment...' : `💳 Pay Commission ₹${p.adminCommission}`}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Message */}
                                {messages[p._id] && (
                                    <div className={`mt-4 rounded-lg p-3 text-sm border ${messages[p._id].type === 'success'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}>
                                        {messages[p._id].text}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Payment History ─── */}
            <div>
                <h2 className="mb-4 text-lg font-bold text-white">Payment History</h2>

                {payments.length === 0 && !fetchError ? (
                    <div className="glass-card p-12 text-center">
                        <p className="text-slate-400 text-lg mb-2">No payments yet</p>
                        <p className="text-slate-500 text-sm">Payments will appear here once customers pay for completed bookings.</p>
                        <Link to="/bookings" className="mt-4 inline-block btn-primary py-2 px-4 text-sm">View Bookings</Link>
                    </div>
                ) : (
                    <div className="glass-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="px-5 py-4">Service</th>
                                        <th className="px-5 py-4">Customer</th>
                                        <th className="px-5 py-4">Date</th>
                                        <th className="px-5 py-4">Total</th>
                                        <th className="px-5 py-4">Your Earnings</th>
                                        <th className="px-5 py-4">Commission</th>
                                        <th className="px-5 py-4">Mode</th>
                                        <th className="px-5 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map(p => (
                                        <tr key={p._id} className="border-b border-slate-700/40 hover:bg-slate-800/30 transition">
                                            <td className="px-5 py-4 text-white font-medium">
                                                {p.booking?.service?.title || '—'}
                                            </td>
                                            <td className="px-5 py-4 text-slate-300">
                                                {p.customer?.name || '—'}
                                            </td>
                                            <td className="px-5 py-4 text-slate-400">
                                                {p.booking?.date
                                                    ? new Date(p.booking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                                    : '—'}
                                            </td>
                                            <td className="px-5 py-4 font-bold text-white">₹{p.totalAmount}</td>
                                            <td className="px-5 py-4 font-bold text-emerald-400">₹{p.providerAmount}</td>
                                            <td className="px-5 py-4 font-bold text-amber-400">₹{p.adminCommission}</td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border font-medium ${p.paymentMode === 'online'
                                                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    }`}>
                                                    {p.paymentMode}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border font-medium ${statusBadge(p.paymentStatus)}`}>
                                                    {p.paymentStatus.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProviderPayments;
