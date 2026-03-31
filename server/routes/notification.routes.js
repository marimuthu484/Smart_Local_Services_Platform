const router = require('express').Router();
const { getNotifications, markAsRead, markAllAsRead, deleteNotification } = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, getNotifications);
router.patch('/:id/read', protect, markAsRead);
router.patch('/read-all', protect, markAllAsRead);
router.delete('/:id', protect, deleteNotification);

module.exports = router;
