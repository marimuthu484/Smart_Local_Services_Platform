const { body } = require('express-validator');

exports.registerValidator = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['customer', 'provider']).withMessage('Invalid role'),
];

exports.loginValidator = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
];

exports.forgotPasswordValidator = [
    body('email').isEmail().withMessage('Valid email is required'),
];

exports.resetPasswordValidator = [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

exports.serviceValidator = [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('price.amount').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
];

exports.bookingValidator = [
    body('service').notEmpty().withMessage('Service ID is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('timeSlot.start').notEmpty().withMessage('Start time is required'),
    body('timeSlot.end').notEmpty().withMessage('End time is required'),
];

exports.reviewValidator = [
    body('booking').notEmpty().withMessage('Booking ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters'),
];
