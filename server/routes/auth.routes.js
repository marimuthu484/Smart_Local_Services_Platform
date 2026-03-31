const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { register, login, getMe, updateProfile, forgotPassword, resetPassword, uploadDocuments } = require('../controllers/auth.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { registerValidator, loginValidator, forgotPasswordValidator, resetPasswordValidator } = require('../validators');
const { uploadDocs } = require('../middleware/upload.middleware');

// Rate limit auth endpoints — 20 attempts per 15 min
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many attempts, try again later' },
});

router.post('/register', authLimiter, registerValidator, validate, register);
router.post('/login', authLimiter, loginValidator, validate, login);
router.post('/forgotpassword', forgotPasswordValidator, validate, forgotPassword);
router.put('/resetpassword/:resettoken', resetPasswordValidator, validate, resetPassword);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/upload-documents', protect, authorize('provider'), uploadDocs.array('documents', 5), uploadDocuments);

module.exports = router;
