const Notification = require('../models/Notification');

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for logged-in user
 */
exports.getNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort('-createdAt')
            .limit(50);

        const unreadCount = await Notification.countDocuments({ user: req.user.id, isRead: false });

        res.json({ success: true, unreadCount, notifications });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark notification as read
 */
exports.markAsRead = async (req, res, next) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read
 */
exports.markAllAsRead = async (req, res, next) => {
    try {
        await Notification.updateMany({ user: req.user.id, isRead: false }, { isRead: true });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 */
exports.deleteNotification = async (req, res, next) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        // Ensure user only deletes their own notifications
        if (notification.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        await notification.deleteOne();
        res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        next(error);
    }
};
