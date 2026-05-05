const express = require('express');
const router  = express.Router();
const {
  // Core
  createJob, sendJobRequest,
  // Worker — request
  acceptJob, rejectJob,
  // Employer — booking
  confirmBooking,
  // Per Day — daily loop
  markArrived, confirmArrival,
  logDayComplete, confirmDailyPayReceived,
  // Per Hour — clock flow
  markOnTheWay, startHourlyWork,
  completeHourlyWork, approveAndPayHourly,
  confirmHourlyPayReceived,
  // Queries
  getWorkerJobs, getWorkerRequests,
  getEmployerJobs, searchWorkers,
} = require('../controllers/jobController');

const { protect, requireRole } = require('../middlewares/auth');
const checkApproval            = require('../middlewares/checkApproval');

// ── Employer: Job creation & request ──────────────────────────────────────────
router.post('/create',           protect, requireRole('employer'), checkApproval, createJob);
router.post('/send-request',     protect, requireRole('employer'), checkApproval, sendJobRequest);

// ── Employer: Booking confirmation ────────────────────────────────────────────
router.patch('/:jobId/confirm-booking',  protect, requireRole('employer'), checkApproval, confirmBooking);

// ── Per Day — Employer side ───────────────────────────────────────────────────
router.patch('/:jobId/confirm-arrival',  protect, requireRole('employer'), confirmArrival);
router.patch('/:jobId/day-complete',     protect, requireRole('employer'), logDayComplete);

// ── Per Day — Worker side ─────────────────────────────────────────────────────
router.patch('/:jobId/arrived',          protect, requireRole('worker'), checkApproval, markArrived);
router.patch('/:jobId/day-pay/:dayLogId/confirm', protect, requireRole('worker'), confirmDailyPayReceived);

// ── Per Hour — Worker side ────────────────────────────────────────────────────
router.patch('/:jobId/on-the-way',       protect, requireRole('worker'), checkApproval, markOnTheWay);
router.patch('/:jobId/start-work',       protect, requireRole('worker'), checkApproval, startHourlyWork);
router.patch('/:jobId/complete-work',    protect, requireRole('worker'), completeHourlyWork);

// ── Per Hour — Employer side ──────────────────────────────────────────────────
router.patch('/:jobId/approve-pay',      protect, requireRole('employer'), approveAndPayHourly);

// ── Per Hour — Worker confirm payment ─────────────────────────────────────────
router.patch('/:jobId/confirm-hourly-pay', protect, requireRole('worker'), confirmHourlyPayReceived);

// ── Worker: request accept / reject ──────────────────────────────────────────
router.patch('/request/:requestId/accept', protect, requireRole('worker'), checkApproval, acceptJob);
router.patch('/request/:requestId/reject', protect, requireRole('worker'), rejectJob);

// ── Queries ───────────────────────────────────────────────────────────────────
router.get('/employer',         protect, requireRole('employer'), getEmployerJobs);
router.get('/worker',           protect, requireRole('worker'),   getWorkerJobs);
router.get('/worker/requests',  protect, requireRole('worker'),   getWorkerRequests);
router.get('/search-workers',   protect, requireRole('employer'), checkApproval, searchWorkers);

module.exports = router;
