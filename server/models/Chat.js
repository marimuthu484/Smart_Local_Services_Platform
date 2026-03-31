const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        content: {
            type: String,
            required: [true, 'Message content is required'],
            maxlength: [2000, 'Message cannot exceed 2000 characters'],
        },
        readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    { timestamps: true }
);

const chatSchema = new mongoose.Schema(
    {
        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
            required: true,
        },
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        messages: [messageSchema],
        lastMessage: {
            content: { type: String, default: '' },
            sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            timestamp: { type: Date },
        },
    },
    { timestamps: true }
);

chatSchema.index({ booking: 1 });
chatSchema.index({ participants: 1 });

module.exports = mongoose.model('Chat', chatSchema);
