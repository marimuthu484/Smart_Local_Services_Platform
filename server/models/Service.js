const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
    {
        provider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Provider is required'],
        },
        title: {
            type: String,
            required: [true, 'Service title is required'],
            trim: true,
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },
        description: {
            type: String,
            required: [true, 'Service description is required'],
            maxlength: [2000, 'Description cannot exceed 2000 characters'],
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            enum: [
                'plumbing',
                'electrical',
                'cleaning',
                'painting',
                'carpentry',
                'appliance-repair',
                'pest-control',
                'gardening',
                'tutoring',
                'beauty',
                'fitness',
                'photography',
                'catering',
                'moving',
                'other',
            ],
        },
        price: {
            amount: { type: Number, required: [true, 'Price is required'], min: 0 },
            unit: {
                type: String,
                enum: ['per_hour', 'per_visit', 'per_project'],
                default: 'per_visit',
            },
        },
        location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], default: [0, 0] },
            address: { type: String, default: '' },
            city: { type: String, default: '' },
            state: { type: String, default: '' },
            serviceRadius: { type: Number, default: 10 }, // km
        },
        images: [{ type: String }],
        availability: {
            days: {
                type: [String],
                enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            },
            startTime: { type: String, default: '09:00' },
            endTime: { type: String, default: '18:00' },
            slotDuration: { type: Number, default: 60, min: 15 }, // minutes
        },
        rating: { type: Number, default: 0 },
        totalReviews: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

/* Indexes */
serviceSchema.index({ category: 1 });
serviceSchema.index({ provider: 1 });
serviceSchema.index({ 'location': '2dsphere' });
serviceSchema.index({ title: 'text', description: 'text' });
serviceSchema.index({ isActive: 1, category: 1 });

module.exports = mongoose.model('Service', serviceSchema);
