const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * @route   POST /api/reviews
 * @desc    Create a review (customer only, after completed booking)
 * 
 * Reviews & feedback are sent to BOTH the service provider AND admin.
 */
exports.createReview = async (req, res, next) => {
    try {
        const { booking: bookingId, rating, comment } = req.body;

        const booking = await Booking.findById(bookingId).populate('service', 'title');
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        if (booking.customer.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Only the customer can review' });
        }

        if (booking.status !== 'completed') {
            return res.status(400).json({ success: false, message: 'Can only review completed bookings' });
        }

        const existingReview = await Review.findOne({ booking: bookingId });
        if (existingReview) {
            return res.status(400).json({ success: false, message: 'Booking already reviewed' });
        }

        const review = await Review.create({
            customer: req.user.id,
            provider: booking.provider,
            service: booking.service._id || booking.service,
            booking: bookingId,
            rating,
            comment,
        });

        // Update service aggregate ratings
        const serviceReviews = await Review.find({ service: booking.service._id || booking.service });
        const avgServiceRating = serviceReviews.reduce((sum, r) => sum + r.rating, 0) / serviceReviews.length;
        await Service.findByIdAndUpdate(booking.service._id || booking.service, {
            rating: Math.round(avgServiceRating * 10) / 10,
            totalReviews: serviceReviews.length,
        });

        // Update provider aggregate ratings
        const providerReviews = await Review.find({ provider: booking.provider });
        const avgProviderRating = providerReviews.reduce((sum, r) => sum + r.rating, 0) / providerReviews.length;
        await User.findByIdAndUpdate(booking.provider, {
            averageRating: Math.round(avgProviderRating * 10) / 10,
            totalReviews: providerReviews.length,
        });

        // ─── NOTIFY PROVIDER about new review ───
        const reviewer = await User.findById(req.user.id).select('name');
        await Notification.create({
            user: booking.provider,
            type: 'new_review',
            title: 'New Review Received',
            message: `${reviewer.name} rated your service "${booking.service.title || 'Service'}" ${rating}/5: "${comment || 'No comment'}"`,
            referenceId: review._id,
        });

        // ─── NOTIFY ALL ADMINS about new review ───
        const admins = await User.find({ role: 'admin' }).select('_id');
        for (const admin of admins) {
            await Notification.create({
                user: admin._id,
                type: 'new_review',
                title: 'New Customer Review',
                message: `${reviewer.name} reviewed provider's service "${booking.service.title || 'Service'}" — ${rating}/5 stars`,
                referenceId: review._id,
            });
        }

        const populated = await review.populate('customer', 'name avatar');
        res.status(201).json({ success: true, review: populated });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/reviews/provider/:providerId
 * @desc    Get reviews for a provider
 */
exports.getProviderReviews = async (req, res, next) => {
    try {
        const reviews = await Review.find({ provider: req.params.providerId })
            .populate('customer', 'name avatar')
            .populate('service', 'title')
            .sort('-createdAt');

        res.json({ success: true, count: reviews.length, reviews });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/reviews/service/:serviceId
 * @desc    Get reviews for a service
 */
exports.getServiceReviews = async (req, res, next) => {
    try {
        const reviews = await Review.find({ service: req.params.serviceId })
            .populate('customer', 'name avatar')
            .sort('-createdAt');

        res.json({ success: true, count: reviews.length, reviews });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/reviews
 * @desc    Get all reviews (admin can see all reviews for moderation)
 */
exports.getAllReviews = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Review.countDocuments();
        const reviews = await Review.find()
            .populate('customer', 'name email')
            .populate('provider', 'name email')
            .populate('service', 'title category')
            .sort('-createdAt')
            .skip(skip)
            .limit(parseInt(limit));

        res.json({ success: true, count: reviews.length, total, reviews });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PATCH /api/reviews/:id/moderate
 * @desc    Moderate a review (admin only)
 */
exports.moderateReview = async (req, res, next) => {
    try {
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { isModerated: true, moderatedBy: req.user.id },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        res.json({ success: true, review });
    } catch (error) {
        next(error);
    }
};
