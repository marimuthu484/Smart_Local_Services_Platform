const router = require('express').Router();
const {
    getUsers, toggleBlockUser, deleteUser,
    getAnalytics, getAllBookings,
    verifyProvider, deleteReview, getReviews,
    markCommissionPaid
} = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect, authorize('admin'));

router.get('/users', getUsers);
router.patch('/users/:id/block', toggleBlockUser);
router.delete('/users/:id', deleteUser);
router.patch('/providers/:id/verify', verifyProvider);
router.get('/analytics', getAnalytics);
router.get('/bookings', getAllBookings);
router.get('/reviews', getReviews);
router.delete('/reviews/:id', deleteReview);
router.patch('/bookings/:id/commission-paid', markCommissionPaid);

module.exports = router;
