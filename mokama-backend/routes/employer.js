const express = require('express');
const router = express.Router();
const Employer = require('../models/Employer');
const Job = require('../models/Job');
const { protect, requireRole } = require('../middlewares/auth');
const { JOB_STATUS } = require('../models/Job');

router.get('/profile', protect, requireRole('employer'), (req, res) => {
  res.json({ success: true, employer: req.user });
});

router.put('/profile', protect, requireRole('employer'), async (req, res) => {
  try {
    const { name, address, state, district, block, pincode } = req.body;
    const employer = await Employer.findByIdAndUpdate(
      req.user._id,
      { name, address, state, district, block, pincode },
      { new: true }
    ).select('-otp -otpExpiry');
    res.json({ success: true, employer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/dashboard', protect, requireRole('employer'), async (req, res) => {
  try {
    const [activeJobs, completedJobs, openJobs] = await Promise.all([
      Job.countDocuments({ employer: req.user._id, status: { $in: [JOB_STATUS.ACCEPTED, JOB_STATUS.WORKING] } }),
      Job.countDocuments({ employer: req.user._id, status: JOB_STATUS.COMPLETED }),
      Job.countDocuments({ employer: req.user._id, status: JOB_STATUS.OPEN })
    ]);
    res.json({ success: true, stats: {
      honourScore: req.user.honourScore,
      activeJobs,
      completedJobs,
      openJobs
    }});
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ── Honour Score Log ──
router.get('/honour-log', protect, requireRole('employer'), async (req, res) => {
  try {
    const HonourLog = require('../models/HonourLog');
    const logs = await HonourLog.find({ userId: req.user._id, userType: 'employer' })
      .sort({ createdAt: -1 })
      .limit(30);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
