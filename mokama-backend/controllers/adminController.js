const Worker  = require('../models/Worker');
const Employer = require('../models/Employer');
const Admin   = require('../models/Admin');
const Job     = require('../models/Job');
const { JOB_STATUS } = require('../models/Job');
const { updateHonourScore } = require('../utils/honour');
const HonourLog  = require('../models/HonourLog');
const { logAdminAction } = require('../utils/adminLog');

const SAFE_SELECT = '-emailOtp -emailOtpExpiry';

// ── In-memory stats cache — 60 second TTL ──
// Avoids hitting MongoDB on every admin page load
let _statsCache = { data: null, expiresAt: 0 };

const invalidateStatsCache = () => { _statsCache.expiresAt = 0; };

exports.getDashboardStats = async (req, res) => {
  try {
    // Serve from cache if still fresh
    if (_statsCache.data && Date.now() < _statsCache.expiresAt) {
      return res.json({ success: true, stats: _statsCache.data, cached: true });
    }

    const [workers, employers, jobs, completedJobs, activeJobs, deletedWorkers, deletedEmployers] = await Promise.all([
      Worker.countDocuments({ isVerified: true, isDeleted: { $ne: true } }),
      Employer.countDocuments({ isVerified: true, isDeleted: { $ne: true } }),
      Job.countDocuments(),
      Job.countDocuments({ status: JOB_STATUS.COMPLETED }),
      Job.countDocuments({ status: { $in: [JOB_STATUS.WORKING, JOB_STATUS.ACCEPTED] } }),
      Worker.countDocuments({ isDeleted: true }),
      Employer.countDocuments({ isDeleted: true }),
    ]);
    const stats = { workers, employers, jobs, completedJobs, activeJobs, deletedWorkers, deletedEmployers };
    _statsCache = { data: stats, expiresAt: Date.now() + 60_000 };  // 60s TTL
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllWorkers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    // Exclude deleted users from main list
    const query = { isDeleted: { $ne: true } };
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    const [workers, total] = await Promise.all([
      Worker.find(query)
        .select(SAFE_SELECT)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Worker.countDocuments(query)
    ]);
    res.json({
      success: true,
      workers,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllEmployers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = { isDeleted: { $ne: true } };
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    const [employers, total] = await Promise.all([
      Employer.find(query)
        .select(SAFE_SELECT)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Employer.countDocuments(query)
    ]);
    res.json({
      success: true,
      employers,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllJobs = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status) query.status = status;
    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate('employer', 'name mobile')
        .populate('worker', 'name mobile')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Job.countDocuments(query)
    ]);
    res.json({
      success: true,
      jobs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.forceCloseJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { note } = req.body;
    const job = await Job.findByIdAndUpdate(
      jobId,
      { status: JOB_STATUS.CANCELLED, adminNote: note || 'Force closed by admin' },
      { new: true }
    );
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, message: 'Job force closed', job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Decrease honour score
exports.penalizeUser = async (req, res) => {
  try {
    const { userId, userType, amount } = req.body;
    if (!['worker', 'employer'].includes(userType))
      return res.status(400).json({ success: false, message: 'Invalid user type' });
    const result = await updateHonourScore(
      userId, userType,
      { change: -(amount || 5), reason: 'Penalised by admin' },
      'admin'
    );
    if (!result) return res.status(404).json({ success: false, message: 'User not found' });
    const penUser = await (userType === 'worker' ? Worker : Employer).findById(userId).select('name');
    logAdminAction(req.user, 'PENALISED_USER', {
      id: userId, type: userType, name: penUser?.name,
      details: `Score reduced by ${amount || 5}. New score: ${result.newScore}`
    });
    res.json({ success: true, message: `Penalised. New score: ${result.newScore}`, newScore: result.newScore });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Increase honour score
exports.increaseHonourScore = async (req, res) => {
  try {
    const { userId, userType, amount } = req.body;
    if (!['worker', 'employer'].includes(userType))
      return res.status(400).json({ success: false, message: 'Invalid user type' });
    const result = await updateHonourScore(
      userId, userType,
      { change: +(amount || 5), reason: 'Score increased by admin' },
      'admin'
    );
    if (!result) return res.status(404).json({ success: false, message: 'User not found' });
    const incUser = await (userType === 'worker' ? Worker : Employer).findById(userId).select('name');
    logAdminAction(req.user, 'INCREASED_HONOUR', {
      id: userId, type: userType, name: incUser?.name,
      details: `Score increased by ${amount || 5}. New score: ${result.newScore}`
    });
    res.json({ success: true, message: `Score increased. New score: ${result.newScore}`, newScore: result.newScore });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Soft delete
exports.deleteUser = async (req, res) => {
  try {
    const { userId, userType } = req.params;
    const { note } = req.body;
    if (!['worker', 'employer'].includes(userType))
      return res.status(400).json({ success: false, message: 'Invalid user type' });
    const Model = userType === 'worker' ? Worker : Employer;
    const user = await Model.findByIdAndUpdate(
      userId,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deleteNote: note || 'Deleted by admin',
        isActive: false,
      },
      { new: true }
    ).select(SAFE_SELECT);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    invalidateStatsCache();
    logAdminAction(req.user, 'DELETED_USER', {
      id: user._id, type: userType, name: user.name,
      details: note || 'Deleted by admin'
    });
    res.json({ success: true, message: `${userType} deleted successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Restore deleted user
exports.restoreUser = async (req, res) => {
  try {
    const { userId, userType } = req.params;
    const Model = userType === 'worker' ? Worker : Employer;
    const user = await Model.findByIdAndUpdate(
      userId,
      { isDeleted: false, deletedAt: null, deleteNote: '', isActive: true },
      { new: true }
    ).select(SAFE_SELECT);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: `${userType} restored successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get deleted users
exports.getDeletedUsers = async (req, res) => {
  try {
    const [workers, employers] = await Promise.all([
      Worker.find({ isDeleted: true })
        .select('-emailOtp -emailOtpExpiry')
        .sort({ deletedAt: -1 }),
      Employer.find({ isDeleted: true })
        .select('-emailOtp -emailOtpExpiry')
        .sort({ deletedAt: -1 }),
    ]);
    res.json({ success: true, workers, employers });
  } catch (err) {
    console.error('getDeletedUsers error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId, userType } = req.params;
    const Model = userType === 'worker' ? Worker : Employer;
    const user = await Model.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    invalidateStatsCache();
    logAdminAction(req.user, user.isActive ? 'ACTIVATED_USER' : 'DEACTIVATED_USER', {
      id: user._id, type: userType, name: user.name,
    });
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.getHonourLog = async (req, res) => {
  try {
    const { userId, userType } = req.params;
    const logs = await HonourLog.find({ userId, userType })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.getAdminLog = async (req, res) => {
  try {
    const AdminLog = require('../models/AdminLog');
    const { limit = 50, page = 1 } = req.query;
    const logs = await AdminLog.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await AdminLog.countDocuments();
    res.json({ success: true, logs, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Seed admin account
exports.seedAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL;
    const existing = await Admin.findOne({ email });
    if (!existing) {
      await Admin.create({ name: 'MoKama Admin', email, password: process.env.ADMIN_PASSWORD, isActive: true });
      console.log('✅ Admin account created');
    } else if (existing.isActive === undefined || existing.isActive === null) {
      await Admin.updateOne({ email }, { $set: { isActive: true } });
      console.log('✅ Admin isActive patched');
    }
  } catch (err) {
    console.error('Admin seed error:', err.message);
  }
};
setTimeout(exports.seedAdmin, 5000);
