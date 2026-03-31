const router = require('express').Router();
const { createBooking, getBookings, getBooking, updateBookingStatus, getAvailability } = require('../controllers/booking.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { bookingValidator } = require('../validators');

router.post('/', protect, authorize('customer'), bookingValidator, validate, createBooking);
router.get('/', protect, getBookings);
router.get('/:id', protect, getBooking);
router.patch('/:id/status', protect, updateBookingStatus);
router.get('/availability/:serviceId', protect, getAvailability);

module.exports = router;
