const AdminLog = require('../models/AdminLog');

// Fire-and-forget logger — never blocks a request
const logAdminAction = (adminUser, action, target = {}) => {
  AdminLog.create({
    adminId:    adminUser._id,
    adminName:  adminUser.name,
    action,
    targetId:   target.id   || null,
    targetType: target.type || 'system',
    targetName: target.name || null,
    details:    target.details || null,
  }).catch(err => console.error('AdminLog error:', err.message));
};

module.exports = { logAdminAction };
