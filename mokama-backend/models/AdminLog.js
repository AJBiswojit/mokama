const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  adminId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  adminName:  { type: String },
  action:     { type: String, required: true },
  targetId:   { type: mongoose.Schema.Types.ObjectId },
  targetType: { type: String, enum: ['worker', 'employer', 'job', 'system'] },
  targetName: { type: String },
  details:    { type: String },
}, { timestamps: true });

adminLogSchema.index({ createdAt: -1 });
adminLogSchema.index({ adminId: 1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);
