const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Customer is required'],
        },
        provider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Provider is required'],
        },
        service: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service',
            required: [true, 'Service is required'],
        },
        date: {
            type: Date,
            required: [true, 'Booking date is required'],
        },
        timeSlot: {
            start: { type: String, required: [true, 'Start time is required'] },
            end: { type: String, required: [true, 'End time is required'] },
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected', 'in-progress', 'completed', 'cancelled'],
            default: 'pending',
        },
        notes: {
            type: String,
            maxlength: [500, 'Notes cannot exceed 500 characters'],
            default: '',
        },
        totalAmount: {
            type: Number,
            required: [true, 'Total amount is required'],
            min: 0,
        },
        customerAddress: {
            type: String,
            default: '',
        },

        // ─── PAYMENT FIELDS ───
        paymentMethod: {
            type: String,
            enum: ['online', 'cash', 'pending'],
            default: 'pending',
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending',
        },
        paidAt: { type: Date },

        // ─── COMMISSION FIELDS ───
        commissionRate: {
            type: Number,
            default: 10,   // 10% platform commission
            min: 0,
            max: 100,
        },
        commissionAmount: {
            type: Number,
            default: 0,
        },
        providerEarnings: {
            type: Number,
            default: 0,
        },
        commissionPaid: {
            type: Boolean,
            default: false,
        },

        // ─── CANCELLATION FIELDS ───
        cancellationReason: {
            type: String,
            default: '',
        },
        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        cancelledAt: {
            type: Date
        }
    },
    { timestamps: true }
);

/* Compound index: prevent overlapping bookings (only for active statuses) */
bookingSchema.index(
    { provider: 1, date: 1, 'timeSlot.start': 1 },
    {
        unique: true,
        partialFilterExpression: { status: { $nin: ['rejected', 'cancelled'] } },
        name: 'atomic_booking_lock'
    }
);
bookingSchema.index({ customer: 1, status: 1 });
bookingSchema.index({ provider: 1, status: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
