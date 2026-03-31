const ActionLog = require('../models/ActionLog');

/**
 * Log a platform action
 * @param {Object} data - Log data
 * @param {string} data.userId - ID of the user performing the action
 * @param {string} data.action - Action type from enum
 * @param {string} [data.targetModel] - Model affected
 * @param {string} [data.targetId] - ID of record affected
 * @param {Object} [data.details] - Extra details
 * @param {Object} [req] - Express request object for IP/UserAgent
 */
const logAction = async (data, req = null) => {
    try {
        const logData = {
            user: data.userId,
            action: data.action,
            targetModel: data.targetModel,
            targetId: data.targetId,
            details: data.details || {},
        };

        if (req) {
            logData.ipAddress = req.ip || req.connection.remoteAddress;
            logData.userAgent = req.get('User-Agent');
        }

        await ActionLog.create(logData);
    } catch (err) {
        console.error('Audit Log Error:', err);
    }
};

module.exports = logAction;
