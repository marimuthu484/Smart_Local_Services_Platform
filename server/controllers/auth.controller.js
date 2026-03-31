const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (customer or provider)
 * 
 * Provider Registration:
 *   - Accepts all extra fields (phone, DOB, education, work category/details/experience, location)
 *   - Sets verificationStatus = "pending"
 *   - Does NOT return a usable token — provider must wait for admin approval
 * 
 * Customer Registration:
 *   - Standard fields (name, email, password, phone, location)
 *   - Immediately gets a token and can use the platform
 */
exports.register = async (req, res, next) => {
    try {
        const {
            name, email, password, role, phone, location,
            // Provider-only fields
            dateOfBirth, educationQualification, workCategory,
            workDetails, workExperience
        } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        // Build creation payload
        const userData = { name, email, password, role: role || 'customer', phone, location };

        // If provider, attach provider-specific profile fields
        if (role === 'provider') {
            Object.assign(userData, {
                dateOfBirth,
                educationQualification,
                workCategory,
                workDetails,
                workExperience,
                verificationStatus: 'pending',
                isVerifiedProvider: false
            });
        }

        const user = await User.create(userData);

        // If provider, do NOT give an active token — they must wait for verification
        if (user.role === 'provider') {
            return res.status(201).json({
                success: true,
                message: 'Registration successful. Your account is pending admin verification. You will be notified once approved.',
                pendingVerification: true,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    verificationStatus: user.verificationStatus
                }
            });
        }

        // Customer gets a token immediately
        const token = user.generateToken();

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                avatar: user.avatar,
                location: user.location,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * 
 * Security checks:
 *   1. Valid credentials
 *   2. Account not blocked
 *   3. Provider must have verificationStatus === 'approved' (cannot login until admin approves)
 */
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: 'Your account has been blocked. Contact support.' });
        }

        // Block unverified providers from logging in
        if (user.role === 'provider' && user.verificationStatus !== 'approved') {
            if (user.verificationStatus === 'pending') {
                return res.status(403).json({
                    success: false,
                    message: 'Your account is pending admin verification. You will be notified once approved.',
                    pendingVerification: true
                });
            }
            if (user.verificationStatus === 'rejected') {
                return res.status(403).json({
                    success: false,
                    message: `Your application was rejected: ${user.rejectionReason || 'Did not meet platform guidelines.'}. Please re-submit documents.`,
                    rejected: true
                });
            }
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = user.generateToken();

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                avatar: user.avatar,
                location: user.location,
                requiresPasswordChange: user.requiresPasswordChange,
                // Provider-specific fields
                isVerifiedProvider: user.isVerifiedProvider,
                verificationStatus: user.verificationStatus,
                totalEarnings: user.totalEarnings,
                completedJobs: user.completedJobs,
                averageRating: user.averageRating,
                totalReviews: user.totalReviews,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged-in user (full profile)
 */
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({ success: true, user });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 */
exports.updateProfile = async (req, res, next) => {
    try {
        const allowedFields = ['name', 'phone', 'bio', 'avatar', 'location'];
        const updates = {};
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        const user = await User.findByIdAndUpdate(req.user.id, updates, {
            new: true,
            runValidators: true,
        });

        res.json({ success: true, user });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/auth/upload-documents
 * @desc    Upload PDF verification documents for provider
 *          Saves {fileUrl, fileName, uploadedAt} objects — admin can preview & download
 */
exports.uploadDocuments = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'Please upload at least one valid PDF document.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Build document objects
        const newDocs = req.files.map(file => ({
            fileUrl: `/uploads/documents/${file.filename}`,
            fileName: file.originalname,
            uploadedAt: new Date()
        }));

        // Append to existing documents
        user.documents.push(...newDocs);

        // Reset status so admin re-reviews
        user.verificationStatus = 'pending';
        user.isVerifiedProvider = false;

        await user.save({ validateBeforeSave: false });

        // Notify all admins about new document submission
        const Notification = require('../models/Notification');
        const adminUsers = await User.find({ role: 'admin' }).select('_id');
        const notifPromises = adminUsers.map(admin =>
            Notification.create({
                user: admin._id,
                type: 'verification_status',
                title: '📄 Provider Documents Submitted',
                message: `${user.name} (${user.email}) has submitted ${newDocs.length} document(s) for verification. Please review their profile.`,
                referenceId: user._id,
            })
        );
        await Promise.all(notifPromises);

        res.json({
            success: true,
            message: `${newDocs.length} document(s) uploaded. Your account is pending admin review.`,
            documents: user.documents
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/auth/forgotpassword
 * @desc    Forgot password — sends reset link via email
 */
exports.forgotPassword = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            return res.status(200).json({ success: true, message: 'If email exists, an email was sent' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: 'Account is blocked' });
        }

        const resetToken = user.getResetPasswordToken();
        await user.save({ validateBeforeSave: false });

        const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
        const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please click the link below:\n\n${resetUrl}\n\nThis link expires in 10 minutes.`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password Reset Request — Smart Local Services',
                message,
            });

            res.status(200).json({ success: true, message: 'Email sent' });
        } catch (err) {
            console.error(err);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });
            return res.status(500).json({ success: false, message: 'Email could not be sent' });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/auth/resetpassword/:resettoken
 * @desc    Reset password using token
 */
exports.resetPassword = async (req, res, next) => {
    try {
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.resettoken)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token' });
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        // If admin required password change, clear that flag
        if (user.requiresPasswordChange) {
            user.requiresPasswordChange = false;
        }

        await user.save();

        const token = user.generateToken();

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
            },
        });
    } catch (error) {
        next(error);
    }
};
