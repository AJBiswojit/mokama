const express = require('express');
const router  = express.Router();
const {
  getDashboardStats, getAllWorkers, getAllEmployers,
  getAllJobs, forceCloseJob, penalizeUser, increaseHonourScore,
  toggleUserStatus, deleteUser, restoreUser, getDeletedUsers,
} = require('../controllers/adminController');
const { protect, requireRole } = require('../middlewares/auth');
const Worker   = require('../models/Worker');
const Employer = require('../models/Employer');

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
router.patch('/jobs/:jobId/force-close', forceCloseJob);

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
// Approve
router.patch('/users/:userType/:userId/approve', async (req, res) => {
  try {
    const Model = req.params.userType === 'worker' ? Worker : Employer;
    const user = await Model.findByIdAndUpdate(
      req.params.userId, { status: 'approved' }, { new: true }
    ).select('-emailOtp -emailOtpExpiry');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: `${req.params.userType} approved`, status: user.status });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Reject
router.patch('/users/:userType/:userId/reject', async (req, res) => {
  try {
    const Model = req.params.userType === 'worker' ? Worker : Employer;
    const user = await Model.findByIdAndUpdate(
      req.params.userId,
      { status: 'rejected', adminNote: req.body.reason || 'Rejected by admin' },
      { new: true }
    ).select('-emailOtp -emailOtpExpiry');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: `${req.params.userType} rejected`, status: user.status });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Restore
router.patch('/users/:userType/:userId/restore', restoreUser);

// Toggle active/inactive — comes AFTER specific named routes
router.patch('/users/:userType/:userId/toggle', toggleUserStatus);

// Delete — comes last among user routes
router.delete('/users/:userType/:userId', deleteUser);

module.exports = router;
