const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Notification = require('../models/Notification');

const COMMISSION_RATE = parseFloat(process.env.COMMISSION_RATE || '20') / 100; // 20%

// Helper: initialize Razorpay instance
const getRazorpay = () => {
    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.includes('REPLACE')) {
        throw new Error('Razorpay keys not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

// Helper: calc split
const calcSplit = (totalAmount) => {
    const adminCommission = Math.round(totalAmount * COMMISSION_RATE * 100) / 100;
    const providerAmount = Math.round((totalAmount - adminCommission) * 100) / 100;
    return { adminCommission, providerAmount };
};

/**
 * @route   POST /api/payments/create-order
 * @desc    Create Razorpay order for ONLINE payment (customer → platform)
 */
exports.createOrder = async (req, res, next) => {
    try {
        const { bookingId } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        if (booking.customer.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (booking.status !== 'completed') {
            return res.status(400).json({ success: false, message: 'Booking must be completed before payment' });
        }

        // Check if payment already exists
        const existingPayment = await Payment.findOne({ booking: bookingId });
        if (existingPayment && existingPayment.paymentStatus !== 'pending') {
            return res.status(400).json({ success: false, message: 'Payment already processed', payment: existingPayment });
        }

        const { adminCommission, providerAmount } = calcSplit(booking.totalAmount);
        const razorpay = getRazorpay();

        // Create Razorpay order (amount in paise)
        const order = await razorpay.orders.create({
            amount: Math.round(booking.totalAmount * 100),
            currency: 'INR',
            receipt: `booking_${bookingId}`,
            notes: {
                bookingId: bookingId.toString(),
                customerId: req.user.id,
                providerId: booking.provider.toString(),
            },
        });

        // Upsert payment record
        let payment = existingPayment;
        if (!payment) {
            payment = await Payment.create({
                booking: bookingId,
                customer: req.user.id,
                provider: booking.provider,
                totalAmount: booking.totalAmount,
                providerAmount,
                adminCommission,
                paymentMode: 'online',
                paymentStatus: 'pending',
                razorpayOrderId: order.id,
            });
        } else {
            payment.razorpayOrderId = order.id;
            await payment.save();
        }

        res.json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
            },
            payment: { id: payment._id, providerAmount, adminCommission },
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/payments/verify-online
 * @desc    Verify Razorpay signature after customer pays online
 *          Auto-distributes: 80% to provider, 20% admin commission tracked
 */
exports.verifyOnlinePayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Payment verification failed — invalid signature' });
        }

        // Update payment record
        const payment = await Payment.findOne({ booking: bookingId });
        if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found' });

        payment.razorpayPaymentId = razorpay_payment_id;
        payment.razorpaySignature = razorpay_signature;
        payment.paymentStatus = 'completed';
        payment.paidAt = Date.now();
        await payment.save();

        // Update booking payment fields
        await Booking.findByIdAndUpdate(bookingId, {
            paymentStatus: 'paid',
            paymentMethod: 'online',
            paidAt: Date.now(),
            commissionAmount: payment.adminCommission,
            providerEarnings: payment.providerAmount,
            commissionPaid: true, // online: commission tracked automatically
        });

        // Credit provider net earnings
        await User.findByIdAndUpdate(payment.provider, {
            $inc: { totalEarnings: payment.providerAmount }
        });

        // Notify provider
        await Notification.create({
            user: payment.provider,
            type: 'booking_completed',
            title: '💳 Payment Received',
            message: `Online payment of ₹${payment.totalAmount} received. Your earnings: ₹${payment.providerAmount} (Platform commission: ₹${payment.adminCommission}).`,
            referenceId: payment._id,
        });

        // Notify customer
        await Notification.create({
            user: payment.customer,
            type: 'booking_completed',
            title: '✅ Payment Successful',
            message: `Payment of ₹${payment.totalAmount} confirmed for your booking. Thank you!`,
            referenceId: payment._id,
        });

        res.json({
            success: true,
            message: 'Payment verified. Funds distributed automatically (80% provider / 20% platform).',
            payment,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/payments/cash-payment
 * @desc    Customer selects OFFLINE (cash) payment mode — creates payment record
 */
exports.initCashPayment = async (req, res, next) => {
    try {
        const { bookingId } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        if (booking.customer.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
        if (booking.status !== 'completed') return res.status(400).json({ success: false, message: 'Booking must be completed first' });

        const existingPayment = await Payment.findOne({ booking: bookingId });
        if (existingPayment) return res.status(400).json({ success: false, message: 'Payment already initiated', payment: existingPayment });

        const { adminCommission, providerAmount } = calcSplit(booking.totalAmount);

        const payment = await Payment.create({
            booking: bookingId,
            customer: req.user.id,
            provider: booking.provider,
            totalAmount: booking.totalAmount,
            providerAmount,
            adminCommission,
            paymentMode: 'offline',
            paymentStatus: 'pending',
        });

        // Update booking
        await Booking.findByIdAndUpdate(bookingId, {
            paymentMethod: 'cash',
            commissionAmount: adminCommission,
            providerEarnings: providerAmount,
        });

        // Notify provider to confirm cash receipt
        await Notification.create({
            user: booking.provider,
            type: 'booking_completed',
            title: '💵 Cash Payment Selected',
            message: `Customer has selected cash payment for ₹${booking.totalAmount}. Please confirm receipt in your dashboard after collecting cash.`,
            referenceId: payment._id,
        });

        res.status(201).json({
            success: true,
            message: 'Cash payment initiated. Provider must confirm receipt.',
            payment,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PATCH /api/payments/:id/confirm-cash
 * @desc    Provider confirms cash received from customer
 */
exports.confirmCashReceived = async (req, res, next) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
        if (payment.provider.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Only the provider can confirm cash receipt' });
        if (payment.paymentMode !== 'offline') return res.status(400).json({ success: false, message: 'Only for offline payments' });

        payment.paymentStatus = 'cash_confirmed';
        payment.cashConfirmedAt = Date.now();
        payment.paidAt = Date.now();
        await payment.save();

        // Credit 80% to provider
        await User.findByIdAndUpdate(payment.provider, {
            $inc: { totalEarnings: payment.providerAmount }
        });

        // Update booking
        await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: 'paid' });

        // Notify customer
        await Notification.create({
            user: payment.customer,
            type: 'booking_completed',
            title: '✅ Cash Receipt Confirmed',
            message: `The provider has confirmed receiving your cash payment of ₹${payment.totalAmount}. Commission of ₹${payment.adminCommission} is now due to the platform.`,
            referenceId: payment._id,
        });

        res.json({
            success: true,
            message: 'Cash confirmed. You must now pay the platform commission online.',
            commissionDue: payment.adminCommission,
            payment,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/payments/:id/create-commission-order
 * @desc    Provider pays admin commission (20%) via Razorpay after cash service
 */
exports.createCommissionOrder = async (req, res, next) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
        if (payment.provider.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
        if (payment.paymentStatus !== 'cash_confirmed') {
            return res.status(400).json({ success: false, message: 'Cash must be confirmed before paying commission' });
        }

        const razorpay = getRazorpay();
        const order = await razorpay.orders.create({
            amount: Math.round(payment.adminCommission * 100), // in paise
            currency: 'INR',
            receipt: `commission_${payment._id}`,
            notes: {
                paymentId: payment._id.toString(),
                type: 'provider_commission',
                providerId: req.user.id,
            },
        });

        payment.commissionOrderId = order.id;
        await payment.save();

        res.json({
            success: true,
            order: { id: order.id, amount: order.amount, currency: order.currency },
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/payments/:id/verify-commission
 * @desc    Verify provider's commission payment to admin
 */
exports.verifyCommissionPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
        if (payment.provider.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Commission payment verification failed' });
        }

        payment.commissionPaymentId = razorpay_payment_id;
        payment.commissionSignature = razorpay_signature;
        payment.paymentStatus = 'completed';
        payment.commissionPaidAt = Date.now();
        await payment.save();

        await Booking.findByIdAndUpdate(payment.booking, { commissionPaid: true });

        // Notify provider confirmation
        await Notification.create({
            user: payment.provider,
            type: 'booking_completed',
            title: '✅ Commission Payment Confirmed',
            message: `Platform commission of ₹${payment.adminCommission} paid successfully. Booking fully settled.`,
            referenceId: payment._id,
        });

        res.json({
            success: true,
            message: 'Commission paid. Booking is fully settled.',
            payment,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/payments/booking/:bookingId
 * @desc    Get payment record for a booking
 */
exports.getPaymentByBooking = async (req, res, next) => {
    try {
        const payment = await Payment.findOne({ booking: req.params.bookingId })
            .populate('customer', 'name email')
            .populate('provider', 'name email');
        if (!payment) return res.status(404).json({ success: false, message: 'No payment found' });
        res.json({ success: true, payment });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/payments/my
 * @desc    Get all payments for the current user (customer or provider)
 */
exports.getMyPayments = async (req, res, next) => {
    try {
        const query = req.user.role === 'customer'
            ? { customer: req.user.id }
            : { provider: req.user.id };

        const payments = await Payment.find(query)
            .populate({
                path: 'booking',
                select: 'date timeSlot status totalAmount',
                populate: { path: 'service', select: 'title images' }
            })
            .populate('customer', 'name email phone')
            .populate('provider', 'name email')
            .sort('-createdAt');

        res.json({ success: true, count: payments.length, payments });
    } catch (error) {
        next(error);
    }
};
