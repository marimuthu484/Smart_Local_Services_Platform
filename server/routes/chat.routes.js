const router = require('express').Router();
const { getChatHistory } = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/:bookingId', protect, getChatHistory);

module.exports = router;
