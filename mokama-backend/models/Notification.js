const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userType: { type: String, enum: ['worker', 'employer', 'admin'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['JOB_REQUEST', 'JOB_ACCEPTED', 'JOB_REJECTED', 'WORK_STARTED', 'WORK_COMPLETED',
           'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'HONOUR_SCORE', 'SYSTEM'],
    default: 'SYSTEM'
  },
  relatedJob: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
