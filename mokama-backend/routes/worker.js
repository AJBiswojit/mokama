const express = require('express');
const router = express.Router();
const Worker = require('../models/Worker');
const { protect, requireRole } = require('../middlewares/auth');

router.get('/profile', protect, requireRole('worker'), async (req, res) => {
  res.json({ success: true, worker: req.user });
});

router.put('/profile', protect, requireRole('worker'), async (req, res) => {
  try {
    const { address, state, district, block, pincode, experience, labourCardNumber } = req.body;
    const worker = await Worker.findByIdAndUpdate(
      req.user._id,
      { address, state, district, block, pincode, experience, labourCardNumber },
      { new: true, runValidators: true }
    ).select('-otp -otpExpiry');
    res.json({ success: true, worker });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/dashboard', protect, requireRole('worker'), async (req, res) => {
  const Job = require('../models/Job');
  const JobRequest = require('../models/JobRequest');
  try {
    const [pendingRequests, activeJob, completedJobs] = await Promise.all([
      JobRequest.countDocuments({ worker: req.user._id, status: 'PENDING' }),
      Job.findOne({ worker: req.user._id, status: { $in: ['ACCEPTED', 'WORKING', 'PAYMENT_PENDING'] } })
        .populate('employer', 'name mobile employerCategoryName'),
      Job.countDocuments({ worker: req.user._id, status: 'COMPLETED' })
    ]);
    res.json({ success: true, stats: {
      honourScore: req.user.honourScore,
      pendingRequests,
      activeJob,
      completedJobs
    }});
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Availability Toggle ──
router.patch('/availability', protect, requireRole('worker'), async (req, res) => {
  try {
    const { availabilityStatus } = req.body;
    if (typeof availabilityStatus !== 'boolean') {
      return res.status(400).json({ success: false, message: 'availabilityStatus must be a boolean' });
    }

    // Block turning ON availability while an active job exists
    if (availabilityStatus === true) {
      const Job = require('../models/Job');
      const activeJob = await Job.findOne({
        worker: req.user._id,
        status: { $in: ['ACCEPTED', 'WORKING', 'PAYMENT_PENDING'] }
      });
      if (activeJob) {
        return res.status(400).json({
          success: false,
          message: 'You have an active job. Complete it before marking yourself as available.'
        });
      }
    }

    const worker = await Worker.findByIdAndUpdate(
      req.user._id,
      { availabilityStatus },
      { new: true }
    ).select('-otp -otpExpiry');
    res.json({
      success: true,
      availabilityStatus: worker.availabilityStatus,
      message: availabilityStatus ? 'You are now available for jobs' : 'You are now unavailable'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ── Honour Score Log — worker sees their own history ──
router.get('/honour-log', protect, requireRole('worker'), async (req, res) => {
  try {
    const HonourLog = require('../models/HonourLog');
    const logs = await HonourLog.find({ userId: req.user._id, userType: 'worker' })
      .sort({ createdAt: -1 })
      .limit(30);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
