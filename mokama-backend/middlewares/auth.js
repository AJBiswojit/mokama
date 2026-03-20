const { verifyToken } = require('../utils/jwt');
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const Admin = require('../models/Admin');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    let user;
    if (decoded.role === 'worker') {
      user = await Worker.findById(decoded.id).select('-otp -otpExpiry');
    } else if (decoded.role === 'employer') {
      user = await Employer.findById(decoded.id).select('-otp -otpExpiry');
    } else if (decoded.role === 'admin') {
      user = await Admin.findById(decoded.id).select('-password');
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: 'Account is disabled' });
    }

    req.user = user;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.userRole)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

module.exports = { protect, requireRole };
