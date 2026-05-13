/**
 * routes/dispute.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Register in server.js:
 *   const disputeRoutes = require('./routes/dispute')
 *   app.use('/api/disputes', disputeRoutes)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router  = express.Router();

const {
  raiseDispute,
  getDisputes,
  getDisputeDetail,
  resolveDispute,
  adminLiftRestrictions,
} = require('../controllers/disputeController');

const { protect, requireRole } = require('../middlewares/auth');

// ── Worker / Employer — raise a dispute ──────────────────────────────────────
router.post('/jobs/:jobId/raise',
  protect,
  raiseDispute
);

// ── Admin — list disputes (open or resolved) ──────────────────────────────────
router.get('/',
  protect, requireRole('admin'),
  getDisputes
);

// ── Admin — single dispute detail ─────────────────────────────────────────────
router.get('/:jobId',
  protect, requireRole('admin'),
  getDisputeDetail
);

// ── Admin — resolve a dispute ─────────────────────────────────────────────────
router.patch('/:jobId/resolve',
  protect, requireRole('admin'),
  resolveDispute
);

// ── Admin — manually lift restrictions ───────────────────────────────────────
router.patch('/user/:userId/lift-restrictions',
  protect, requireRole('admin'),
  adminLiftRestrictions
);

module.exports = router;