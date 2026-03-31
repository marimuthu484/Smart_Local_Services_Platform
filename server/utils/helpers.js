/**
 * Async handler wrapper to avoid try/catch in every controller.
 * (Alternative to writing try-catch blocks manually.)
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Create an error with a status code.
 */
const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

module.exports = { asyncHandler, createError };
