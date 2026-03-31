const User = require('../models/User');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const logAction = require('../utils/logger');

/**
 * @route   GET /api/admin/users
 */
exports.getUsers = async (req, res, next) => {
    try {
        const { role, search, page = 1, limit = 20 } = req.query;
        const query = {};
        if (role) query.role = role;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await User.countDocuments(query);
        const users = await User.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit));
        res.json({ success: true, count: users.length, total, users });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PATCH /api/admin/users/:id/block
 */
exports.toggleBlockUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        user.isBlocked = !user.isBlocked;
        await user.save();

        await logAction({
            userId: req.user.id,
            action: user.isBlocked ? 'USER_BLOCK' : 'USER_UNBLOCK',
            targetModel: 'User', targetId: user._id,
            details: { email: user.email }
        }, req);

        // Notify the user
        await Notification.create({
            user: user._id,
            type: 'account_blocked',
            title: user.isBlocked ? 'Account Blocked' : 'Account Unblocked',
            message: user.isBlocked
                ? 'Your account has been blocked by admin. Contact support for assistance.'
                : 'Your account has been unblocked. You can now use the platform again.',
        });

        res.json({ success: true, message: `User ${user.isBlocked ? 'blocked' : 'unblocked'}`, user });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Permanently delete a user or provider account (admin authority)
 */
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.role === 'admin') {
            return res.status(400).json({ success: false, message: 'Cannot delete admin accounts' });
        }

        // If provider, also deactivate their services
        if (user.role === 'provider') {
            await Service.updateMany({ provider: user._id }, { isActive: false });
        }

        // Cancel all pending/accepted bookings
        await Booking.updateMany(
            { $or: [{ customer: user._id }, { provider: user._id }], status: { $in: ['pending', 'accepted'] } },
            { status: 'cancelled', cancellationReason: 'Account deleted by admin', cancelledAt: Date.now() }
        );

        await logAction({
            userId: req.user.id,
            action: 'USER_DELETE',
            targetModel: 'User', targetId: user._id,
            details: { email: user.email, role: user.role }
        }, req);

        await user.deleteOne();

        res.json({ success: true, message: `${user.role} account "${user.email}" permanently deleted` });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/admin/analytics
 * @desc    Platform analytics including commission/revenue tracking
 */
exports.getAnalytics = async (req, res, next) => {
    try {
        const [
            totalUsers, totalProviders, totalCustomers,
            totalBookings, totalServices, totalReviews,
            activeBookings, cancelledBookings
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: 'provider' }),
            User.countDocuments({ role: 'customer' }),
            Booking.countDocuments(),
            Service.countDocuments(),
            Review.countDocuments(),
            Booking.countDocuments({ status: { $in: ['pending', 'accepted', 'in-progress'] } }),
            Booking.countDocuments({ status: 'cancelled' }),
        ]);

        const cancellationRate = totalBookings > 0
            ? ((cancelledBookings / totalBookings) * 100).toFixed(1)
            : 0;

        const bookingsByStatus = await Booking.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);

        // Revenue & Commission analytics
        const revenueResult = await Booking.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' },
                    totalCommission: { $sum: '$commissionAmount' },
                    totalProviderEarnings: { $sum: '$providerEarnings' },
                    unpaidCommission: {
                        $sum: { $cond: [{ $eq: ['$commissionPaid', false] }, '$commissionAmount', 0] }
                    },
                    completedBookings: { $sum: 1 }
                }
            },
        ]);
        const revenue = revenueResult[0] || {
            totalRevenue: 0, totalCommission: 0, totalProviderEarnings: 0, unpaidCommission: 0, completedBookings: 0
        };

        const topCategories = await Service.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
        ]);

        const topProviders = await User.find({ role: 'provider', isVerifiedProvider: true })
            .sort({ completedJobs: -1, totalEarnings: -1 })
            .limit(5)
            .select('name email averageRating totalReviews totalEarnings completedJobs');

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const monthlyBookings = await Booking.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    count: { $sum: 1 },
                    revenue: { $sum: '$totalAmount' },
                    commission: { $sum: '$commissionAmount' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const dailyActiveUsers = await User.countDocuments({ updatedAt: { $gte: oneDayAgo } });

        res.json({
            success: true,
            analytics: {
                totalUsers, totalProviders, totalCustomers,
                totalBookings, totalServices, totalReviews,
                activeBookings, cancelledBookings,
                cancellationRate: parseFloat(cancellationRate),
                // Commission & Revenue
                totalRevenue: revenue.totalRevenue,
                totalCommission: revenue.totalCommission,
                totalProviderEarnings: revenue.totalProviderEarnings,
                unpaidCommission: revenue.unpaidCommission,
                completedBookings: revenue.completedBookings,
                bookingsByStatus, topCategories, topProviders,
                monthlyBookings, dailyActiveUsers,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/admin/bookings
 */
exports.getAllBookings = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const query = {};
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Booking.countDocuments(query);
        const bookings = await Booking.find(query)
            .populate('service', 'title category')
            .populate('customer', 'name email')
            .populate('provider', 'name email')
            .sort('-createdAt')
            .skip(skip)
            .limit(parseInt(limit));

        res.json({ success: true, count: bookings.length, total, bookings });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/admin/reviews
 * @desc    Get all reviews for moderation
 */
exports.getReviews = async (req, res, next) => {
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
 * @route   PATCH /api/admin/providers/:id/verify
 */
exports.verifyProvider = async (req, res, next) => {
    try {
        const { status, rejectionReason } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const user = await User.findById(req.params.id);
        if (!user || user.role !== 'provider') {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        user.verificationStatus = status;
        if (status === 'approved') {
            user.isVerifiedProvider = true;
            user.rejectionReason = '';
        } else {
            user.isVerifiedProvider = false;
            user.rejectionReason = rejectionReason || 'Did not meet platform guidelines.';
        }
        await user.save();

        await logAction({
            userId: req.user.id,
            action: status === 'approved' ? 'PROVIDER_VERIFY_APPROVED' : 'PROVIDER_VERIFY_REJECTED',
            targetModel: 'User', targetId: user._id,
            details: { status, rejectionReason }
        }, req);

        await Notification.create({
            user: user._id,
            type: 'verification_status',
            title: status === 'approved' ? 'Account Approved!' : 'Application Rejected',
            message: status === 'approved'
                ? 'Your provider account has been verified. You can now log in and start listing services.'
                : `Your application was rejected: ${user.rejectionReason}`,
        });

        res.json({ success: true, message: `Provider ${status}`, user });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/admin/reviews/:id
 */
exports.deleteReview = async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        const providerId = review.provider;
        await review.deleteOne();

        // Recalculate provider rating
        const pipeline = await Review.aggregate([
            { $match: { provider: providerId } },
            { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
        ]);
        const avgData = pipeline[0] || { avg: 0, count: 0 };
        await User.findByIdAndUpdate(providerId, {
            averageRating: avgData.avg,
            totalReviews: avgData.count,
        });

        res.json({ success: true, message: 'Review deleted and rating recalculated' });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PATCH /api/admin/bookings/:id/commission-paid
 * @desc    Mark commission as paid by provider
 */
exports.markCommissionPaid = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        booking.commissionPaid = true;
        await booking.save();

        res.json({ success: true, message: 'Commission marked as paid', booking });
    } catch (error) {
        next(error);
    }
};
