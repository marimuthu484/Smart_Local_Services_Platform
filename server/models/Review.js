const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Customer is required'],
        },
        provider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Provider is required'],
        },
        service: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service',
            required: [true, 'Service is required'],
        },
        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
            required: [true, 'Booking is required'],
        },
        rating: {
            type: Number,
            required: [true, 'Rating is required'],
            min: [1, 'Rating must be at least 1'],
            max: [5, 'Rating cannot exceed 5'],
        },
        comment: {
            type: String,
            maxlength: [1000, 'Comment cannot exceed 1000 characters'],
            default: '',
        },
        isModerated: {
            type: Boolean,
            default: false,
        },
        moderatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
);

/* Ensure one review per booking */
reviewSchema.index({ booking: 1 }, { unique: true });
reviewSchema.index({ provider: 1 });
reviewSchema.index({ service: 1 });

/* Post middleware to auto-calculate and update provider average rating upon review changes */
reviewSchema.statics.calculateAverageRating = async function (providerId) {
    const obj = await this.aggregate([
        {
            $match: { provider: providerId }
        },
        {
            $group: {
                _id: '$provider',
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
            }
        }
    ]);

    try {
        if (obj.length > 0) {
            await this.model('User').findByIdAndUpdate(providerId, {
                averageRating: Math.round(obj[0].averageRating * 10) / 10,
                totalReviews: obj[0].totalReviews
            });
        } else {
            // No reviews left
            await this.model('User').findByIdAndUpdate(providerId, {
                averageRating: 0,
                totalReviews: 0
            });
        }
    } catch (err) {
        console.error(err);
    }
};

// Call calculateAverageRating after save
reviewSchema.post('save', function () {
    this.constructor.calculateAverageRating(this.provider);
});

// Call calculateAverageRating before remove/delete
reviewSchema.post('deleteOne', { document: true, query: false }, function () {
    this.constructor.calculateAverageRating(this.provider);
});

module.exports = mongoose.model('Review', reviewSchema);
