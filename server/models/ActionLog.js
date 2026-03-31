const mongoose = require('mongoose');

const actionLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'USER_LOGIN',
            'USER_REGISTER',
            'USER_BLOCK',
            'USER_UNBLOCK',
            'PROVIDER_VERIFY_APPROVED',
            'PROVIDER_VERIFY_REJECTED',
            'BOOKING_CREATE',
            'BOOKING_STATUS_CHANGE',
            'SERVICE_CREATE',
            'SERVICE_UPDATE',
            'PASSWORD_RESET_REQUEST',
            'PASSWORD_RESET_SUCCESS'
        ]
    },
    targetModel: String, // 'User', 'Booking', 'Service'
    targetId: mongoose.Schema.Types.ObjectId,
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: String,
    userAgent: String
}, { timestamps: true });

module.exports = mongoose.model('ActionLog', actionLogSchema);
