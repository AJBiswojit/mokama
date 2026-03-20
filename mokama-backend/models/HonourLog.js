const mongoose = require('mongoose');

const honourLogSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, required: true },
  userType: { type: String, enum: ['worker', 'employer'], required: true },
  change:   { type: Number, required: true },   // +5 or -10
  reason:   { type: String, required: true },   // human-readable
  newScore: { type: Number, required: true },
  source:   {
    type: String,
    enum: ['system', 'admin', 'job'],
    default: 'system'
  },
}, { timestamps: true });

// Index for fast user lookups
honourLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('HonourLog', honourLogSchema);
