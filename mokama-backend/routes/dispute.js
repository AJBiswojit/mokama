/**
 * routes/dispute.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Worker/Employer raise disputes on jobs.
 * Admin views and resolves disputes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express')
const router  = express.Router()
const {
  raiseDispute,
  getDisputes,
  getDisputeDetail,
  resolveDispute,
} = require('../controllers/disputeController')

const { protect, requireRole } = require('../middlewares/auth')
const adminAuth = require('../middlewares/adminAuth')   // or however your admin auth middleware is named

// ── Worker / Employer — raise a dispute ──────────────────────────────────────
router.post('/jobs/:jobId/raise',   protect, raiseDispute)

// ── Admin — list all disputes ────────────────────────────────────────────────
router.get('/',                     adminAuth, getDisputes)

// ── Admin — get single dispute detail ───────────────────────────────────────
router.get('/:jobId',               adminAuth, getDisputeDetail)

// ── Admin — resolve a dispute ────────────────────────────────────────────────
router.patch('/:jobId/resolve',     adminAuth, resolveDispute)

module.exports = router
