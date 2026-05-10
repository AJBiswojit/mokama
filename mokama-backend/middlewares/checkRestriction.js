/**
 * middlewares/checkRestrictions.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Granular restriction middleware — does NOT freeze the full account.
 * Only blocks the specific action the user is restricted from.
 *
 * Usage in routes:
 *   router.post('/create', protect, requireRole('employer'),
 *     checkRestrictions.canCreateJob, createJob)
 *
 *   router.patch('/accept', protect, requireRole('worker'),
 *     checkRestrictions.canAcceptJob, acceptJob)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Worker   = require('../models/Worker');
const Employer = require('../models/Employer');

// ─── Generic restriction checker ──────────────────────────────────────────────
function buildChecker(role, restrictionKey, actionLabel) {
  return async (req, res, next) => {
    try {
      const Model = role === 'worker' ? Worker : Employer;
      const user  = await Model.findById(req.user._id).select('restrictions name');

      if (!user) return res.status(401).json({ success: false, message: 'User not found' });

      const restrictions = user.restrictions || {};

      if (restrictions[restrictionKey] === false) {
        return res.status(403).json({
          success:   false,
          restricted: true,
          action:    actionLabel,
          message:   `Your account currently cannot: ${actionLabel}.`,
          reason:    restrictions.restrictionReason || 'Active dispute or violation under review',
          note:      'You can still browse, view history, and contact support. This restriction will be lifted once the issue is resolved.',
          canDo: [
            'Browse available jobs',
            'View your profile and history',
            'View active jobs',
            'Contact support',
          ],
          cannotDo: [actionLabel],
        });
      }

      next();
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
}

// ─── Specific checkers ────────────────────────────────────────────────────────

// Employer: cannot post new jobs while in dispute
const canCreateJob = buildChecker('employer', 'canCreateNewJobs', 'Create new job postings');

// Worker: cannot accept new job requests while in dispute
const canAcceptJob = buildChecker('worker', 'canAcceptNewJobs', 'Accept new job requests');

// Worker: cannot receive payments while in dispute
const canReceivePayment = buildChecker('worker', 'canReceivePayments', 'Receive payments');

// Employer: cannot release payments while in dispute
const canReleasePayment = buildChecker('employer', 'canReleasePayments', 'Release payments');

// ─── Full restriction status (for frontend dashboard) ─────────────────────────
// GET /restrictions/status — returns what the user can/cannot do
async function getRestrictionStatus(req, res) {
  try {
    const role  = req.user.role;
    const Model = role === 'worker' ? Worker : Employer;
    const user  = await Model.findById(req.user._id).select('restrictions name');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const r = user.restrictions || {};
    const hasRestrictions = Object.values(r).some(v => v === false);

    res.json({
      success: true,
      hasRestrictions,
      restrictions: {
        canCreateNewJobs:   r.canCreateNewJobs   !== false,
        canAcceptNewJobs:   r.canAcceptNewJobs   !== false,
        canReceivePayments: r.canReceivePayments !== false,
        canReleasePayments: r.canReleasePayments !== false,
        canBrowse:          true,
        canViewHistory:     true,
        canContactSupport:  true,
      },
      reason: r.restrictionReason || null,
      restrictedAt: r.restrictedAt || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  canCreateJob,
  canAcceptJob,
  canReceivePayment,
  canReleasePayment,
  getRestrictionStatus,
};
