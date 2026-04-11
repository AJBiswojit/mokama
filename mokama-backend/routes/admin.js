const express = require('express');
const router  = express.Router();
const {
  getDashboardStats, getAllWorkers, getAllEmployers,
  getAllJobs, forceCloseJob, penalizeUser, increaseHonourScore,
  toggleUserStatus, deleteUser, restoreUser, getDeletedUsers, getHonourLog, getAdminLog,
} = require('../controllers/adminController');
const { protect, requireRole } = require('../middlewares/auth');
const Worker   = require('../models/Worker');
const Employer = require('../models/Employer');
const { sendEmail }      = require('../utils/emailOtp');
const { logAdminAction } = require('../utils/adminLog');

// ── Email templates ──
const approvalEmail = (name) => `
<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
            background: #0a0a0a; color: #f0f0f0; padding: 32px; border-radius: 16px;">
  <h2 style="color: #ff2400; margin: 0 0 4px 0;">MoKama</h2>
  <p style="color: #6b6b6b; font-size: 12px; margin: 0 0 24px 0;">Where Work Meets Trust</p>
  <p style="color: #a3a3a3;">Hi <strong style="color: #f0f0f0;">${name}</strong>,</p>
  <div style="background: #16a34a15; border: 1px solid #16a34a40; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
    <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
    <p style="color: #4ade80; font-size: 18px; font-weight: bold; margin: 0;">Account Approved!</p>
  </div>
  <p style="color: #a3a3a3;">Your MoKama account has been verified and approved by our team. You now have full access to all platform features.</p>
  <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}"
     style="display: block; background: #ff2400; color: white; text-align: center;
            padding: 14px; border-radius: 10px; text-decoration: none;
            font-weight: bold; font-size: 15px; margin: 20px 0;">
    Login to MoKama
  </a>
  <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 24px 0;" />
  <p style="color: #3a3a3a; font-size: 12px; text-align: center;">© 2025 MoKama — Kaam ko Mukam tak</p>
</div>`;

const rejectionEmail = (name, reason) => {
  const reasonBlock = reason
    ? `<div style="background: #1a1a1a; border-left: 3px solid #f87171; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
        <p style="color: #6b6b6b; font-size: 12px; margin: 0 0 4px 0;">Reason:</p>
        <p style="color: #f0f0f0; font-size: 14px; margin: 0;">${reason}</p>
       </div>`
    : '';
  return `
<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
            background: #0a0a0a; color: #f0f0f0; padding: 32px; border-radius: 16px;">
  <h2 style="color: #ff2400; margin: 0 0 4px 0;">MoKama</h2>
  <p style="color: #6b6b6b; font-size: 12px; margin: 0 0 24px 0;">Where Work Meets Trust</p>
  <p style="color: #a3a3a3;">Hi <strong style="color: #f0f0f0;">${name}</strong>,</p>
  <div style="background: #dc262615; border: 1px solid #dc262640; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
    <div style="font-size: 32px; margin-bottom: 8px;">❌</div>
    <p style="color: #f87171; font-size: 18px; font-weight: bold; margin: 0;">Account Not Approved</p>
  </div>
  <p style="color: #a3a3a3;">Unfortunately, your MoKama account could not be approved at this time.</p>
  ${reasonBlock}
  <p style="color: #6b6b6b; font-size: 13px;">For assistance, contact us at <a href="mailto:support@mokama.in" style="color: #ff2400;">support@mokama.in</a></p>
  <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 24px 0;" />
  <p style="color: #3a3a3a; font-size: 12px; text-align: center;">© 2025 MoKama — Kaam ko Mukam tak</p>
</div>`;
};

router.use(protect, requireRole('admin'));

// ── Stats ──
router.get('/stats', getDashboardStats);

// ── User lists ──
router.get('/workers',   getAllWorkers);
router.get('/employers', getAllEmployers);
router.get('/jobs',      getAllJobs);

// ── Deleted users panel ──
router.get('/deleted-users', getDeletedUsers);

// ── Pending approvals ──
router.get('/pending-users', async (req, res) => {
  try {
    const [workers, employers] = await Promise.all([
      Worker.find({ status: 'pending', isVerified: true, isDeleted: { $ne: true } })
        .select('name mobile email workerTypeName honourScore createdAt status')
        .sort({ createdAt: -1 }),
      Employer.find({ status: 'pending', isVerified: true, isDeleted: { $ne: true } })
        .select('name mobile email employerCategoryName honourScore createdAt status')
        .sort({ createdAt: -1 }),
    ]);
    res.json({ success: true, workers, employers });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── Job actions ──
router.patch('/jobs/:jobId/force-close', async (req, res) => {
  try {
    const Job = require('../models/Job');
    const { JOB_STATUS } = require('../models/Job');
    const { note } = req.body;
    const job = await Job.findByIdAndUpdate(
      req.params.jobId,
      { status: JOB_STATUS.CANCELLED, adminNote: note || 'Force closed by admin' },
      { new: true }
    );
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    logAdminAction(req.user, 'FORCE_CLOSED_JOB', {
      id: job._id, type: 'job', name: job.title,
      details: note || 'Force closed by admin'
    });
    res.json({ success: true, message: 'Job force closed', job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── Honour score ──
router.post('/penalize',        penalizeUser);
router.post('/increase-honour', increaseHonourScore);

// ── Availability override ──
router.patch('/workers/:workerId/availability', async (req, res) => {
  try {
    const { availabilityStatus } = req.body;
    if (typeof availabilityStatus !== 'boolean')
      return res.status(400).json({ success: false, message: 'availabilityStatus must be boolean' });
    const worker = await Worker.findByIdAndUpdate(
      req.params.workerId, { availabilityStatus }, { new: true }
    ).select('-emailOtp -emailOtpExpiry');
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.json({ success: true, availabilityStatus: worker.availabilityStatus });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── IMPORTANT: Specific action routes MUST come before generic :param routes ──
// Approve — Fix 4: sends approval email
router.patch('/users/:userType/:userId/approve', async (req, res) => {
  try {
    const Model = req.params.userType === 'worker' ? Worker : Employer;
    const user = await Model.findByIdAndUpdate(
      req.params.userId, { status: 'approved' }, { new: true }
    ).select('-emailOtp -emailOtpExpiry');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Send approval email (non-blocking)
    if (user.email) {
      sendEmail(
        user.email,
        'Your MoKama Account is Approved! 🎉',
        approvalEmail(user.name)
      );
    }

    logAdminAction(req.user, 'APPROVED_USER', {
      id: user._id, type: req.params.userType, name: user.name,
      details: `Approved ${req.params.userType} account`
    });
    res.json({ success: true, message: `${req.params.userType} approved`, status: user.status });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Reject — Fix 4: sends rejection email
router.patch('/users/:userType/:userId/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const Model = req.params.userType === 'worker' ? Worker : Employer;
    const user = await Model.findByIdAndUpdate(
      req.params.userId,
      { status: 'rejected', adminNote: reason || 'Rejected by admin' },
      { new: true }
    ).select('-emailOtp -emailOtpExpiry');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Send rejection email (non-blocking)
    if (user.email) {
      sendEmail(
        user.email,
        'Update on Your MoKama Account',
        rejectionEmail(user.name, reason)
      );
    }

    logAdminAction(req.user, 'REJECTED_USER', {
      id: user._id, type: req.params.userType, name: user.name,
      details: reason || 'No reason given'
    });
    res.json({ success: true, message: `${req.params.userType} rejected`, status: user.status });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Restore
router.patch('/users/:userType/:userId/restore', async (req, res) => {
  try {
    const Model = req.params.userType === 'worker' ? Worker : Employer;
    const user  = await Model.findByIdAndUpdate(
      req.params.userId,
      { isDeleted: false, deletedAt: null, deleteNote: '', isActive: true },
      { new: true }
    ).select('-emailOtp -emailOtpExpiry');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    logAdminAction(req.user, 'RESTORED_USER', {
      id: user._id, type: req.params.userType, name: user.name,
    });
    res.json({ success: true, message: `${req.params.userType} restored successfully` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Toggle active/inactive — comes AFTER specific named routes
router.patch('/users/:userType/:userId/toggle', toggleUserStatus);

// Delete — comes last among user routes
router.delete('/users/:userType/:userId', deleteUser);

// Honour score log
router.get('/honour-log/:userType/:userId', getHonourLog);

// Admin activity log
router.get('/activity-log', getAdminLog);


// Hide / unhide a job (soft delete for jobs)
router.patch('/jobs/:jobId/toggle-hidden', async (req, res) => {
  try {
    const Job = require('../models/Job');
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    job.isHidden = !job.isHidden;
    await job.save();
    logAdminAction(req.user, job.isHidden ? 'HID_JOB' : 'UNHID_JOB', {
      id: job._id, type: 'job', name: job.title,
    });
    res.json({ success: true, isHidden: job.isHidden,
      message: `Job ${job.isHidden ? 'hidden' : 'unhidden'} successfully` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
