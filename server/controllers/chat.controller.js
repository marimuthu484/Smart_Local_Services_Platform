const Chat = require('../models/Chat');

/**
 * @route   GET /api/chat/:bookingId
 * @desc    Get chat messages for a booking
 */
exports.getChatHistory = async (req, res, next) => {
    try {
        const chat = await Chat.findOne({ booking: req.params.bookingId })
            .populate('participants', 'name avatar')
            .populate('messages.sender', 'name avatar');

        if (!chat) {
            return res.json({ success: true, chat: null, messages: [] });
        }

        // Verify user is a participant
        const isParticipant = chat.participants.some(
            (p) => p._id.toString() === req.user.id
        );

        if (!isParticipant && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        res.json({ success: true, chat });
    } catch (error) {
        next(error);
    }
};
