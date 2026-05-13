/**
 * routes/restrictions.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Exposes the restriction status endpoint used by RestrictionBanner.jsx
 * to check what actions the current user is blocked from.
 *
 * Register in server.js:
 *   const restrictionRoutes = require('./routes/restrictions')
 *   app.use('/api/restrictions', restrictionRoutes)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router  = express.Router();

const { protect }              = require('../middlewares/auth');
const { getRestrictionStatus } = require('../middlewares/checkRestrictions');

// GET /api/restrictions/status
// Returns what the logged-in user can and cannot currently do.
// Used by RestrictionBanner.jsx on both worker and employer dashboards.
router.get('/status', protect, getRestrictionStatus);

module.exports = router;