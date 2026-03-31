const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
            required: true,
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        provider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        // ─── Amount Fields ───
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        providerAmount: {
            type: Number,   // 80% of totalAmount
            required: true,
            min: 0,
        },
        adminCommission: {
            type: Number,   // 20% of totalAmount
            required: true,
            min: 0,
        },

        // ─── Payment Mode ───
        paymentMode: {
            type: String,
            enum: ['online', 'offline'],
            required: true,
        },

        // ─── Payment Status ───
        paymentStatus: {
            type: String,
            enum: ['pending', 'customer_paid', 'cash_confirmed', 'commission_paid', 'completed', 'failed'],
            default: 'pending',
        },

        // ─── Razorpay Fields (online payment) ───
        razorpayOrderId: { type: String },
        razorpayPaymentId: { type: String },
        razorpaySignature: { type: String },

        // ─── Commission Payment (provider → admin) ───
        commissionOrderId: { type: String },      // Razorpay order for commission
        commissionPaymentId: { type: String },    // Razorpay payment for commission
        commissionSignature: { type: String },
        commissionPaidAt: { type: Date },

        // ─── Cash Confirmation ───
        cashConfirmedAt: { type: Date },

        // ─── Timestamps ───
        paidAt: { type: Date },
    },
    { timestamps: true }
);

paymentSchema.index({ booking: 1 }, { unique: true });
paymentSchema.index({ provider: 1, paymentStatus: 1 });
paymentSchema.index({ customer: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
