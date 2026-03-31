const router = require('express').Router();
const {
    createOrder,
    verifyOnlinePayment,
    initCashPayment,
    confirmCashReceived,
    createCommissionOrder,
    verifyCommissionPayment,
    getPaymentByBooking,
    getMyPayments,
} = require('../controllers/payment.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

// Customer: initiate payment
router.post('/create-order', authorize('customer'), createOrder);
router.post('/verify-online', authorize('customer'), verifyOnlinePayment);
router.post('/cash-payment', authorize('customer'), initCashPayment);

// Provider: confirm cash & pay commission
router.patch('/:id/confirm-cash', authorize('provider'), confirmCashReceived);
router.post('/:id/create-commission-order', authorize('provider'), createCommissionOrder);
router.post('/:id/verify-commission', authorize('provider'), verifyCommissionPayment);

// Shared
router.get('/my', getMyPayments);
router.get('/booking/:bookingId', getPaymentByBooking);

module.exports = router;
