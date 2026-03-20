/**
 * checkApproval middleware
 * Blocks access to protected routes if user is not approved.
 * Apply ONLY to job posting, worker search, and hiring APIs.
 * Do NOT apply to login, register, or profile routes.
 */
const checkApproval = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  if (user.status === 'rejected') {
    return res.status(403).json({
      success: false,
      code: 'ACCOUNT_REJECTED',
      message: 'Your account has been rejected. Please contact support at support@mokama.in'
    });
  }

  if (user.status === 'pending') {
    return res.status(403).json({
      success: false,
      code: 'ACCOUNT_PENDING',
      message: 'Your account is under review. You will be notified once approved.'
    });
  }

  // status === 'approved' — allow through
  next();
};

module.exports = checkApproval;
