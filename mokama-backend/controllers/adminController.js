const Worker  = require('../models/Worker');
const Employer = require('../models/Employer');
const Admin   = require('../models/Admin');
const Job     = require('../models/Job');
const { JOB_STATUS } = require('../models/Job');
const { updateHonourScore } = require('../utils/honour');
const HonourLog  = require('../models/HonourLog');
const { logAdminAction } = require('../utils/adminLog');
const { sendEmail } = require('../utils/emailOtp');

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

// ── Approve worker or employer account ──────────────────────────────────────
exports.approveUser = async (req, res) => {
  try {
    const { userId, userType } = req.params;

    if (!['worker', 'employer'].includes(userType))
      return res.status(400).json({ success: false, message: 'Invalid user type' });

    const Model = userType === 'worker' ? Worker : Employer;

    const user = await Model.findByIdAndUpdate(
      userId,
      { status: 'approved', isVerified: true, isActive: true },
      { new: true }
    ).select(SAFE_SELECT);

    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    // ── Approval email ───────────────────────────────────────────────────────
    const role    = userType === 'worker' ? 'Worker' : 'Employer';
    const appLink = process.env.FRONTEND_URL || 'https://mokama.vercel.app';

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Account Approved — MoKama</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
          <tr>
            <td align="center">
              <table width="560" cellpadding="0" cellspacing="0"
                     style="background:#ffffff;border-radius:12px;overflow:hidden;
                            box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                <!-- Header -->
                <tr>
                  <td style="background:#ff2400;padding:28px 32px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;
                               letter-spacing:-0.3px;">
                      MoKama
                    </h1>
                    <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
                      Connecting Workers &amp; Employers
                    </p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:36px 32px 28px;">

                    <!-- Tick icon -->
                    <div style="text-align:center;margin-bottom:24px;">
                      <div style="display:inline-block;width:64px;height:64px;
                                  background:#f0fdf4;border-radius:50%;
                                  line-height:64px;font-size:32px;">
                        ✅
                      </div>
                    </div>

                    <h2 style="margin:0 0 8px;color:#111111;font-size:20px;
                               font-weight:700;text-align:center;">
                      Account Approved!
                    </h2>
                    <p style="margin:0 0 24px;color:#555555;font-size:15px;
                               text-align:center;line-height:1.6;">
                      Hi <strong>${user.name}</strong>, your <strong>${role}</strong>
                      account on MoKama has been reviewed and approved by our team.
                      You can now log in and start using the platform.
                    </p>

                    <!-- What's unlocked -->
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#fff8f6;border:1px solid #ffe0da;
                                  border-radius:10px;margin-bottom:28px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <p style="margin:0 0 12px;font-size:13px;font-weight:700;
                                     color:#ff2400;text-transform:uppercase;
                                     letter-spacing:0.05em;">
                            What's now available to you
                          </p>
                          ${userType === 'worker' ? `
                          <p style="margin:6px 0;color:#333;font-size:14px;">
                            ✔ &nbsp; Browse and receive job requests
                          </p>
                          <p style="margin:6px 0;color:#333;font-size:14px;">
                            ✔ &nbsp; Set your availability status
                          </p>
                          <p style="margin:6px 0;color:#333;font-size:14px;">
                            ✔ &nbsp; Build your Honour Score
                          </p>
                          <p style="margin:6px 0;color:#333;font-size:14px;">
                            ✔ &nbsp; Get paid and tracked through the platform
                          </p>
                          ` : `
                          <p style="margin:6px 0;color:#333;font-size:14px;">
                            ✔ &nbsp; Post job requirements and hire workers
                          </p>
                          <p style="margin:6px 0;color:#333;font-size:14px;">
                            ✔ &nbsp; Browse verified workers near you
                          </p>
                          <p style="margin:6px 0;color:#333;font-size:14px;">
                            ✔ &nbsp; Manage active and completed jobs
                          </p>
                          <p style="margin:6px 0;color:#333;font-size:14px;">
                            ✔ &nbsp; Build your employer reputation
                          </p>
                          `}
                        </td>
                      </tr>
                    </table>

                    <!-- CTA button -->
                    <div style="text-align:center;margin-bottom:12px;">
                      <a href="${appLink}"
                         style="display:inline-block;background:#ff2400;color:#ffffff;
                                text-decoration:none;font-size:15px;font-weight:600;
                                padding:13px 36px;border-radius:8px;
                                letter-spacing:0.02em;">
                        Go to MoKama →
                      </a>
                    </div>

                    <p style="margin:20px 0 0;color:#888888;font-size:13px;
                               text-align:center;line-height:1.6;">
                      If you have any questions, reply to this email or contact
                      our support team.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#f9f9f9;border-top:1px solid #eeeeee;
                             padding:16px 32px;text-align:center;">
                    <p style="margin:0;color:#aaaaaa;font-size:12px;">
                      © ${new Date().getFullYear()} MoKama. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Fire-and-forget — don't block approval if email fails
    sendEmail(user.email, '✅ Your MoKama Account is Approved!', html)
      .catch(err => console.error('Approval email failed:', err.message));

    invalidateStatsCache();

    logAdminAction(req.user, 'APPROVED_USER', {
      id: user._id, type: userType, name: user.name,
    });

    res.json({
      success: true,
      message: `${role} account approved. Approval email sent to ${user.email}.`,
      user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Seed admin account
exports.seedAdmin = async () => {
  try {
    const email    = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    const existing = await Admin.findOne({ email });

    if (!existing) {
      // Create fresh admin — bcrypt applied via pre-save hook
      await Admin.create({ name: 'MoKama Admin', email, password, isActive: true });
      console.log('✅ Admin account created:', email);
    } else {
      // Patch: ensure isActive is set and password is up to date
      let changed = false;

      if (existing.isActive !== true) {
        existing.isActive = true;
        changed = true;
      }

      // Always re-verify password is correctly hashed
      // If plain-text was stored before, this fixes it
      const isMatch = await existing.comparePassword(password);
      if (!isMatch) {
        // Password in DB doesn't match .env — update it
        existing.password = password; // pre-save hook will bcrypt it
        changed = true;
        console.log('🔑 Admin password updated from .env');
      }

      if (changed) {
        await existing.save();
        console.log('✅ Admin account patched');
      } else {
        console.log('✅ Admin account OK');
      }
    }
  } catch (err) {
    console.error('Admin seed error:', err.message);
  }
};
setTimeout(exports.seedAdmin, 5000);
