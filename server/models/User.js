const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [50, 'Name cannot exceed 50 characters'],
        },
        email: {
            type: String,
            required: [true, 'Please add an email'],
            unique: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please add a valid email'
            ]
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false,
        },
        role: {
            type: String,
            enum: ['customer', 'provider', 'admin'],
            default: 'customer'
        },
        // ---- Platform Verification & Security ----
        isBlocked: {
            type: Boolean,
            default: false
        },
        requiresPasswordChange: {
            type: Boolean,
            default: false
        },
        isVerifiedProvider: {
            type: Boolean,
            default: false
        },
        verificationStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        rejectionReason: {
            type: String,
            default: ''
        },
        // ---- Provider Profile Ext & Documents ----
        dateOfBirth: Date,
        educationQualification: String,
        workCategory: String,
        workDetails: String,
        workExperience: String,
        documents: [
            {
                fileUrl: { type: String, required: true },
                fileName: { type: String, required: true },
                uploadedAt: { type: Date, default: Date.now }
            }
        ],
        phone: { type: String, default: '' },
        avatar: { type: String, default: '' },
        bio: { type: String, maxlength: [500, 'Bio max 500 chars'], default: '' },
        // ---- Geospatial Location ----
        location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], default: [0, 0] },
            address: String,
            city: String,
        },
        // ---- Aggregation Metrics Cache ----
        averageRating: { type: Number, default: 0 },
        totalReviews: { type: Number, default: 0 },
        totalEarnings: { type: Number, default: 0 },
        completedJobs: { type: Number, default: 0 },
        // ---- Security Reset Tokens ----
        resetPasswordToken: String,
        resetPasswordExpire: Date
    },
    { timestamps: true }
);

/* Indexes */
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ location: '2dsphere' });


/* Hash password before save */
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

/* Compare password */
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

/* Generate JWT */
userSchema.methods.generateToken = function () {
    return jwt.sign(
        { id: this._id, role: this.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

/* Generate and hash password token */
userSchema.methods.getResetPasswordToken = function () {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expire (10 minutes)
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

module.exports = mongoose.model('User', userSchema);
