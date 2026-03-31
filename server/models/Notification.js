const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            enum: ['booking', 'booking_created', 'booking_accepted', 'booking_rejected', 'booking_completed', 'booking_cancelled', 'new_review', 'verification_status', 'account_blocked'],
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        referenceId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
