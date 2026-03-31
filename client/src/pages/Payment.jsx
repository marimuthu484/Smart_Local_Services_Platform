import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Load Razorpay script
const loadRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const Payment = () => {
    const { bookingId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [paymentMode, setPaymentMode] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const bookingRes = await api.get(`/bookings/${bookingId}`);
                setBooking(bookingRes.data.booking);

                try {
                    const paymentRes = await api.get(`/payments/booking/${bookingId}`);
                    setPayment(paymentRes.data.payment);
                } catch {
                    // No payment yet — that's fine
                }
            } catch (err) {
                setError('Failed to load booking details.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [bookingId]);

    // ─── ONLINE PAYMENT ───
    const handleOnlinePayment = async () => {
        setProcessing(true);
        setError('');
        const loaded = await loadRazorpay();
        if (!loaded) {
            setError('Failed to load payment gateway. Check your internet connection.');
            setProcessing(false);
            return;
        }

        try {
            const orderRes = await api.post('/payments/create-order', { bookingId });
            const { order, keyId } = orderRes.data;

            const options = {
                key: keyId,
                amount: order.amount,
                currency: order.currency,
                name: 'SmartLocal Services',
                description: `Payment for ${booking?.service?.title || 'Service'}`,
                order_id: order.id,
                handler: async (response) => {
                    try {
                        const verifyRes = await api.post('/payments/verify-online', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            bookingId,
                        });
                        setPayment(verifyRes.data.payment);
                        setSuccess('✅ Payment successful! Funds distributed: 80% to provider, 20% platform commission.');
                    } catch (err) {
                        setError(err.response?.data?.message || 'Payment verification failed.');
                    }
                    setProcessing(false);
                },
                prefill: {
                    name: user?.name,
                    email: user?.email,
                },
                theme: { color: '#6366f1' },
                modal: {
                    ondismiss: () => {
                        setProcessing(false);
                        setError('Payment was cancelled.');
                    }
                }
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (err) {
            setError(err.response?.data?.message || 'Could not initiate payment.');
            setProcessing(false);
        }
    };

    // ─── OFFLINE/CASH PAYMENT ───
    const handleCashPayment = async () => {
        setProcessing(true);
        setError('');
        try {
            const res = await api.post('/payments/cash-payment', { bookingId });
            setPayment(res.data.payment);
            setSuccess('💵 Cash payment selected. The provider will confirm receipt after collecting cash from you.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to initiate cash payment.');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return (
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
    );

    const totalAmount = booking?.totalAmount || 0;
    const providerAmount = Math.round(totalAmount * 0.8 * 100) / 100;
    const adminCommission = Math.round(totalAmount * 0.2 * 100) / 100;

    const isAlreadyPaid = payment?.paymentStatus === 'completed' || payment?.paymentStatus === 'customer_paid';

    return (
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-white">Complete Payment</h1>
                <p className="mt-2 text-slate-400">Choose how you want to pay for your service</p>
            </div>

            {/* Booking Summary */}
            <div className="glass-card p-6 mb-6">
                <h2 className="text-lg font-bold text-white mb-4">Booking Summary</h2>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-400">Service</span>
                        <span className="text-white font-medium">{booking?.service?.title || 'Service'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Provider</span>
                        <span className="text-white">{booking?.provider?.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Date</span>
                        <span className="text-white">{booking?.date ? new Date(booking.date).toLocaleDateString() : '-'}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-700 pt-3 mt-3">
                        <span className="text-white font-bold">Total Amount</span>
                        <span className="text-2xl font-bold text-white">₹{totalAmount}</span>
                    </div>
                </div>

                {/* Distribution Breakdown */}
                <div className="mt-4 rounded-lg bg-slate-800/60 border border-slate-700 p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Distribution</p>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-300">🛠 Provider Earnings (80%)</span>
                            <span className="text-emerald-400 font-medium">₹{providerAmount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-300">🏢 Platform Commission (20%)</span>
                            <span className="text-amber-400 font-medium">₹{adminCommission}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success/Error Messages */}
            {error && (
                <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">{error}</div>
            )}
            {success && (
                <div className="mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                    <p className="text-sm text-emerald-400 font-medium">{success}</p>
                    <button onClick={() => navigate('/bookings')} className="mt-3 text-xs text-emerald-300 underline">Go to My Bookings →</button>
                </div>
            )}

            {/* Payment Status Badge */}
            {payment && (
                <div className="mb-6 glass-card p-4">
                    <p className="text-sm text-slate-400 mb-1">Payment Status</p>
                    <span className={`badge text-sm ${payment.paymentStatus === 'completed' ? 'badge-completed' :
                            payment.paymentStatus === 'cash_confirmed' ? 'badge-accepted' :
                                'badge-pending'
                        }`}>
                        {payment.paymentStatus.replace(/_/g, ' ')}
                    </span>
                    {payment.paymentMode === 'offline' && payment.paymentStatus === 'cash_confirmed' && (
                        <p className="text-xs text-amber-400 mt-2">⚠ Commission of ₹{payment.adminCommission} must be paid to the platform by the provider.</p>
                    )}
                </div>
            )}

            {/* Payment Options — only show if not yet paid */}
            {!isAlreadyPaid && !success && (
                <>
                    {!paymentMode ? (
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold text-white mb-4">Select Payment Method</h2>

                            <button onClick={() => setPaymentMode('online')}
                                className="w-full glass-card p-6 border-2 border-transparent hover:border-indigo-500 transition text-left flex items-center gap-4">
                                <div className="h-14 w-14 rounded-xl bg-indigo-500/20 flex items-center justify-center text-2xl flex-shrink-0">💳</div>
                                <div>
                                    <h3 className="text-white font-bold text-lg">Online Payment</h3>
                                    <p className="text-slate-400 text-sm mt-1">Pay securely via Razorpay. Supports UPI, Cards, Net Banking, Wallets.</p>
                                    <p className="text-indigo-400 text-xs mt-1 font-medium">Instant — Automatic 80/20 distribution</p>
                                </div>
                            </button>

                            <button onClick={() => setPaymentMode('cash')}
                                className="w-full glass-card p-6 border-2 border-transparent hover:border-emerald-500 transition text-left flex items-center gap-4">
                                <div className="h-14 w-14 rounded-xl bg-emerald-500/20 flex items-center justify-center text-2xl flex-shrink-0">💵</div>
                                <div>
                                    <h3 className="text-white font-bold text-lg">Cash Payment</h3>
                                    <p className="text-slate-400 text-sm mt-1">Pay directly to the provider in cash. Provider confirms receipt.</p>
                                    <p className="text-amber-400 text-xs mt-1 font-medium">Provider pays 20% commission to platform separately</p>
                                </div>
                            </button>
                        </div>
                    ) : paymentMode === 'online' ? (
                        <div className="glass-card p-6">
                            <button onClick={() => setPaymentMode('')} className="text-sm text-slate-400 hover:text-white mb-6 block">← Change method</button>
                            <h2 className="text-lg font-bold text-white mb-2">Online Payment via Razorpay</h2>
                            <p className="text-slate-400 text-sm mb-6">You'll be redirected to Razorpay's secure payment page.</p>
                            <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-4 mb-6 text-sm">
                                <p className="text-indigo-300">After payment: <span className="font-bold text-white">₹{providerAmount}</span> goes to provider, <span className="font-bold text-white">₹{adminCommission}</span> to platform — automatically.</p>
                            </div>
                            <button onClick={handleOnlinePayment} disabled={processing}
                                className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2">
                                {processing ? (
                                    <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Processing...</>
                                ) : `💳 Pay ₹${totalAmount} Online`}
                            </button>
                        </div>
                    ) : (
                        <div className="glass-card p-6">
                            <button onClick={() => setPaymentMode('')} className="text-sm text-slate-400 hover:text-white mb-6 block">← Change method</button>
                            <h2 className="text-lg font-bold text-white mb-2">Cash Payment</h2>
                            <div className="space-y-3 mb-6 text-sm">
                                <div className="flex items-start gap-3 bg-slate-800/50 rounded-lg p-3">
                                    <span className="text-indigo-400 font-bold flex-shrink-0">1.</span>
                                    <p className="text-slate-300">Click confirm below — the provider will be notified to collect cash from you.</p>
                                </div>
                                <div className="flex items-start gap-3 bg-slate-800/50 rounded-lg p-3">
                                    <span className="text-indigo-400 font-bold flex-shrink-0">2.</span>
                                    <p className="text-slate-300">Pay <strong className="text-white">₹{totalAmount}</strong> directly to the provider.</p>
                                </div>
                                <div className="flex items-start gap-3 bg-slate-800/50 rounded-lg p-3">
                                    <span className="text-indigo-400 font-bold flex-shrink-0">3.</span>
                                    <p className="text-slate-300">The provider confirms cash receipt in their dashboard, then pays <strong className="text-amber-400">₹{adminCommission}</strong> commission to the platform.</p>
                                </div>
                            </div>
                            <button onClick={handleCashPayment} disabled={processing}
                                className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500">
                                {processing ? 'Processing...' : `💵 Confirm Cash Payment (₹${totalAmount})`}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Payment;
