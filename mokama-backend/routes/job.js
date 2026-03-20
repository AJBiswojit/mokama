const express = require('express');
const router = express.Router();
const {
  createJob, sendJobRequest, acceptJob, rejectJob,
  confirmWorkStarted, markWorkCompleted, confirmPayment,
  confirmPaymentReceived, getWorkerJobs, getWorkerRequests,
  getEmployerJobs, searchWorkers
} = require('../controllers/jobController');
const { protect, requireRole } = require('../middlewares/auth');
const checkApproval = require('../middlewares/checkApproval');

// ── Employer actions (approval required for posting & hiring) ──
router.post('/create',           protect, requireRole('employer'), checkApproval, createJob);
router.post('/send-request',     protect, requireRole('employer'), checkApproval, sendJobRequest);
router.patch('/:jobId/start',    protect, requireRole('employer'), checkApproval, confirmWorkStarted);
router.patch('/:jobId/confirm-payment', protect, requireRole('employer'), confirmPayment);
router.get('/employer',          protect, requireRole('employer'), getEmployerJobs);

// ── Worker actions (approval required for accepting jobs) ──
router.patch('/request/:requestId/accept', protect, requireRole('worker'), checkApproval, acceptJob);
router.patch('/request/:requestId/reject', protect, requireRole('worker'), rejectJob);
router.patch('/:jobId/complete', protect, requireRole('worker'), markWorkCompleted);
router.patch('/:jobId/confirm-payment-received', protect, requireRole('worker'), confirmPaymentReceived);
router.get('/worker',            protect, requireRole('worker'), getWorkerJobs);
router.get('/worker/requests',   protect, requireRole('worker'), getWorkerRequests);

// ── Search (approval required) ──
router.get('/search-workers', protect, requireRole('employer'), checkApproval, searchWorkers);

module.exports = router;
