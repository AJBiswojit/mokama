const Worker  = require('../models/Worker');
const Employer = require('../models/Employer');
const Admin   = require('../models/Admin');
const { WorkerType, EmployerCategory } = require('../models/Category');
const { generateToken, generateTokens } = require('../utils/jwt');
const { generateEmailOTP, getEmailOTPExpiry, sendEmailOTP } = require('../utils/emailOtp');
const otpCache = require('../utils/otpCache');

const INDIAN_PHONE = /^[6-9]\d{9}$/;
const EMAIL_REGEX  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─────────────────────────────────────────────────────────
//  WORKER
// ─────────────────────────────────────────────────────────

// POST /auth/worker/register
exports.workerRegister = async (req, res) => {
  try {
    const {
      name, fatherName, gender, dob, mobile, email,
      address, pincode, workerType, experience, labourCardNumber
    } = req.body;

    // Validate
    if (!name || !fatherName || !gender || !dob || !mobile || !email || !address || !pincode)
      return res.status(400).json({ success: false, message: 'All required fields must be filled' });
    if (!INDIAN_PHONE.test(mobile))
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number' });
    if (!EMAIL_REGEX.test(email))
      return res.status(400).json({ success: false, message: 'Enter a valid email address' });

    // Check duplicates
    const byMobile = await Worker.findOne({ mobile });
    if (byMobile && byMobile.isVerified)
      return res.status(400).json({ success: false, message: 'Mobile number already registered' });

    const byEmail = await Worker.findOne({ email: email.toLowerCase() });
    if (byEmail && byEmail.isVerified && byEmail.mobile !== mobile)
      return res.status(400).json({ success: false, message: 'Email already registered with another account' });

    // Resolve worker type
    let workerTypeId = null, workerTypeName = workerType || '';
    if (workerType) {
      const wt = await WorkerType.findOne({ name: workerType });
      if (wt) { workerTypeId = wt._id; workerTypeName = wt.name; }
    }

    // Generate OTP
    const otp = generateEmailOTP();

    const data = {
      name, fatherName, gender, dob, mobile,
      email: email.toLowerCase(),
      address, pincode,
      workerType: workerTypeId,
      workerTypeName,
      experience: experience || 0,
      labourCardNumber: labourCardNumber || '',
      isVerified: false,
      status: byMobile?.status || 'pending',
    };

    if (byMobile) {
      Object.assign(byMobile, data);
      await byMobile.save();
    } else {
      await Worker.create(data);
    }

    // Store OTP in fast in-memory cache instead of DB
    otpCache.set(mobile, otp);

    const smsResult = await sendEmailOTP(email, otp, name);
    if (!smsResult.success)
      return res.status(500).json({ success: false, message: smsResult.message });

    res.json({
      success: true,
      message: `OTP sent to ${email}`,
      ...(process.env.NODE_ENV !== 'production' && { devOtp: smsResult.devOtp })
    });
  } catch (err) {
    console.error('workerRegister:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /auth/worker/verify-otp
exports.workerVerifyOTP = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp)
      return res.status(400).json({ success: false, message: 'mobile and otp are required' });

    const worker = await Worker.findOne({ mobile });
    if (!worker)
      return res.status(404).json({ success: false, message: 'Worker not found. Please register first.' });

    const cacheResult = otpCache.verify(mobile, otp);
    if (!cacheResult.valid)
      return res.status(400).json({ success: false, message: cacheResult.reason });

    worker.isVerified      = true;
    worker.isEmailVerified = true;
    await worker.save();

    const { accessToken, refreshToken } = generateTokens({ id: worker._id, role: 'worker' });
    res.json({
      success: true,
      message: 'Verified successfully',
      token: accessToken,
      refreshToken,
      user: worker.toSafeObject(),
      accountStatus: worker.status,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /auth/worker/login  — find user then send email OTP
exports.workerLogin = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile || !INDIAN_PHONE.test(mobile))
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number' });

    const worker = await Worker.findOne({ mobile });
    if (!worker)
      return res.status(404).json({ success: false, message: 'Mobile number not registered' });
    if (worker.isDeleted)
      return res.status(403).json({ success: false, code: 'ACCOUNT_DELETED', message: 'Your account was deactivated by Admin. Please contact support@mokama.in' });
    if (!worker.isVerified)
      return res.status(400).json({ success: false, message: 'Account not verified. Please complete registration.' });
    if (worker.status === 'rejected')
      return res.status(403).json({ success: false, code: 'ACCOUNT_REJECTED', message: 'Your account has been rejected. Contact support@mokama.in' });
    if (!worker.isActive)
      return res.status(403).json({ success: false, message: 'Account is disabled. Contact support.' });

    const otp = generateEmailOTP();
    otpCache.set(mobile, otp);   // cache only — no DB write

    const result = await sendEmailOTP(worker.email, otp, worker.name);
    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });

    res.json({
      success: true,
      message: `OTP sent to your registered email`,
      email: worker.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // mask email
      ...(process.env.NODE_ENV !== 'production' && { devOtp: result.devOtp })
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /auth/worker/login/verify
exports.workerLoginVerify = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp)
      return res.status(400).json({ success: false, message: 'mobile and otp are required' });

    const worker = await Worker.findOne({ mobile });
    if (!worker)
      return res.status(404).json({ success: false, message: 'Worker not found' });

    const cacheResult = otpCache.verify(mobile, otp);
    if (!cacheResult.valid)
      return res.status(400).json({ success: false, message: cacheResult.reason });

    const { accessToken, refreshToken } = generateTokens({ id: worker._id, role: 'worker' });
    res.json({
      success: true,
      message: 'Login successful',
      token: accessToken,
      refreshToken,
      user: worker.toSafeObject(),
      accountStatus: worker.status,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────
//  EMPLOYER
// ─────────────────────────────────────────────────────────

// POST /auth/employer/register
exports.employerRegister = async (req, res) => {
  try {
    const { name, mobile, email, address, pincode, employerCategory } = req.body;

    if (!name || !mobile || !email || !address || !pincode)
      return res.status(400).json({ success: false, message: 'All required fields must be filled' });
    if (!INDIAN_PHONE.test(mobile))
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number' });
    if (!EMAIL_REGEX.test(email))
      return res.status(400).json({ success: false, message: 'Enter a valid email address' });

    const byMobile = await Employer.findOne({ mobile });
    if (byMobile && byMobile.isVerified)
      return res.status(400).json({ success: false, message: 'Mobile number already registered' });

    const byEmail = await Employer.findOne({ email: email.toLowerCase() });
    if (byEmail && byEmail.isVerified && byEmail.mobile !== mobile)
      return res.status(400).json({ success: false, message: 'Email already registered with another account' });

    let catDoc = null;
    if (employerCategory)
      catDoc = await EmployerCategory.findOne({ name: employerCategory });

    const otp = generateEmailOTP();

    const data = {
      name, mobile,
      email: email.toLowerCase(),
      address, pincode,
      employerCategory: catDoc?._id,
      employerCategoryName: employerCategory || '',
      isVerified: false,
      status: byMobile?.status || 'pending',
    };

    if (byMobile) {
      Object.assign(byMobile, data);
      await byMobile.save();
    } else {
      await Employer.create(data);
    }

    otpCache.set(mobile, otp);   // cache only — no DB write

    const result = await sendEmailOTP(email, otp, name);
    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });

    res.json({
      success: true,
      message: `OTP sent to ${email}`,
      ...(process.env.NODE_ENV !== 'production' && { devOtp: result.devOtp })
    });
  } catch (err) {
    console.error('employerRegister:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /auth/employer/verify-otp
exports.employerVerifyOTP = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp)
      return res.status(400).json({ success: false, message: 'mobile and otp are required' });

    const employer = await Employer.findOne({ mobile });
    if (!employer)
      return res.status(404).json({ success: false, message: 'Employer not found. Please register first.' });

    const cacheResult = otpCache.verify(mobile, otp);
    if (!cacheResult.valid)
      return res.status(400).json({ success: false, message: cacheResult.reason });

    employer.isVerified      = true;
    employer.isEmailVerified = true;
    await employer.save();

    const { accessToken, refreshToken } = generateTokens({ id: employer._id, role: 'employer' });
    res.json({
      success: true,
      message: 'Verified successfully',
      token: accessToken,
      refreshToken,
      user: employer.toSafeObject(),
      accountStatus: employer.status,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /auth/employer/login
exports.employerLogin = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile || !INDIAN_PHONE.test(mobile))
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number' });

    const employer = await Employer.findOne({ mobile });
    if (!employer)
      return res.status(404).json({ success: false, message: 'Mobile number not registered' });
    if (employer.isDeleted)
      return res.status(403).json({ success: false, code: 'ACCOUNT_DELETED', message: 'Your account was deactivated by Admin. Please contact support@mokama.in' });
    if (!employer.isVerified)
      return res.status(400).json({ success: false, message: 'Account not verified. Please complete registration.' });
    if (employer.status === 'rejected')
      return res.status(403).json({ success: false, code: 'ACCOUNT_REJECTED', message: 'Your account has been rejected. Contact support@mokama.in' });
    if (!employer.isActive)
      return res.status(403).json({ success: false, message: 'Account is disabled. Contact support.' });

    const otp = generateEmailOTP();
    otpCache.set(mobile, otp);   // cache only — no DB write

    const result = await sendEmailOTP(employer.email, otp, employer.name);
    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });

    res.json({
      success: true,
      message: `OTP sent to your registered email`,
      email: employer.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
      ...(process.env.NODE_ENV !== 'production' && { devOtp: result.devOtp })
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /auth/employer/login/verify
exports.employerLoginVerify = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp)
      return res.status(400).json({ success: false, message: 'mobile and otp are required' });

    const employer = await Employer.findOne({ mobile });
    if (!employer)
      return res.status(404).json({ success: false, message: 'Employer not found' });

    const cacheResult = otpCache.verify(mobile, otp);
    if (!cacheResult.valid)
      return res.status(400).json({ success: false, message: cacheResult.reason });

    const token = generateToken({ id: employer._id, role: 'employer' });
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: employer.toSafeObject(),
      accountStatus: employer.status,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────
//  ADMIN
// ─────────────────────────────────────────────────────────

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin)
      return res.status(404).json({ success: false, message: 'Admin not found' });
    const isMatch = await admin.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = generateToken({ id: admin._id, role: 'admin' });
    res.json({ success: true, token, user: { _id: admin._id, name: admin.name, email: admin.email, role: 'admin' } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────
//  SHARED
// ─────────────────────────────────────────────────────────

exports.getCategories = async (req, res) => {
  try {
    const { WorkerType, EmployerCategory } = require('../models/Category');
    const workerTypes        = await WorkerType.find({ isActive: true });
    const employerCategories = await EmployerCategory.find({ isActive: true });
    res.json({ success: true, workerTypes, employerCategories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user, role: req.userRole });
};

// ─────────────────────────────────────────────────────────
//  REFRESH TOKEN
// ─────────────────────────────────────────────────────────

// POST /auth/refresh
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(401).json({ success: false, message: 'Refresh token required' });

    const { verifyRefreshToken, generateTokens } = require('../utils/jwt');
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token. Please login again.' });
    }

    // Verify user still exists and is active
    const Worker   = require('../models/Worker');
    const Employer = require('../models/Employer');
    const Admin    = require('../models/Admin');

    let user;
    if (decoded.role === 'worker')       user = await Worker.findById(decoded.id);
    else if (decoded.role === 'employer') user = await Employer.findById(decoded.id);
    else if (decoded.role === 'admin')    user = await Admin.findById(decoded.id);

    if (!user || user.isDeleted || user.isActive === false)
      return res.status(401).json({ success: false, message: 'Account no longer active. Please login again.' });

    const { accessToken, refreshToken: newRefreshToken } = generateTokens({
      id: decoded.id,
      role: decoded.role,
    });

    res.json({
      success: true,
      token: accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
