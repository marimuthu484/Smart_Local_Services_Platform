const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes — verify JWT and attach user to request.
 */
const protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'Not authorized — no token' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: 'Account has been blocked' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Not authorized — invalid token' });
    }
};

/**
 * Role-based access control middleware.
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Role '${req.user.role}' is not authorized to access this route`,
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
