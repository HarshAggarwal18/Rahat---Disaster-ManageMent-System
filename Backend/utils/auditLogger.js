const AuditLog = require('../models/AuditLog');

const createAuditLog = async (req, action, entityType, entityId, details = {}) => {
  try {
    const user = req.user || {};

    await AuditLog.create({
      userId: user._id,
      userName: `${user.firstName || 'Unknown'} ${user.lastName || ''}`.trim(),
      role: user.role || 'unknown',
      action,
      entityType,
      entityId,
      entityLabel: details.entityLabel || '',
      details,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || ''
    });
  } catch (error) {
    console.warn('Audit log creation failed:', error.message);
  }
};

module.exports = {
  createAuditLog
};
