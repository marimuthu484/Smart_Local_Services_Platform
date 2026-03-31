const router = require('express').Router();
const { createReview, getProviderReviews, getServiceReviews, moderateReview } = require('../controllers/review.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { reviewValidator } = require('../validators');

router.post('/', protect, authorize('customer'), reviewValidator, validate, createReview);
router.get('/provider/:providerId', getProviderReviews);
router.get('/service/:serviceId', getServiceReviews);
router.patch('/:id/moderate', protect, authorize('admin'), moderateReview);

module.exports = router;
