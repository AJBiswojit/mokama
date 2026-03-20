const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middlewares/auth');

router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user._id,
      userType: req.userRole
    }).sort({ createdAt: -1 }).limit(30);

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      userType: req.userRole,
      isRead: false
    });

    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/mark-read', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, userType: req.userRole, isRead: false },
      { isRead: true }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/read', protect, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
