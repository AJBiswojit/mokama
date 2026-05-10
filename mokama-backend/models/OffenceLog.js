const mongoose = require('mongoose');

/**
 * OffenceLog.js
 * One document per offence event — worker or employer.
 * Used by penaltyEngine to determine progressive severity.
 */
const offenceLogSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, required: true },
  role:        { type: String, enum: ['worker', 'employer'], required: true },
  jobId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },

  offenceType: {
    type: String,
    enum: [
      'NO_SHOW',          // worker didn't arrive
      'LATE_LOG',         // employer didn't mark day complete
      'LATE_PAYMENT',     // employer delayed payment release
      'LATE_APPROVAL',    // employer delayed approving hours
      'FAKE_ARRIVAL',     // suspicious GPS/attendance
      'DISPUTE_ABUSE',    // raised frivolous dispute
      'LATE_CONFIRM',     // worker didn't confirm payment
    ],
    required: true,
  },

  severity:    { type: String, enum: ['warning', 'minor', 'major'], required: true },
  pointsDelta: { type: Number, default: 0 },          // 0 for warnings, negative for penalties
  scoreAfter:  { type: Number },                      // honour score after applying

  note:        { type: String, default: '' },
  issuedAt:    { type: Date, default: Date.now },
  cooldownEnds:{ type: Date },                        // re-offence before this = higher tier
  isWarningOnly: { type: Boolean, default: false },   // true = email only, no score change
}, { timestamps: true });

// Index for fast lookups in penaltyEngine
offenceLogSchema.index({ userId: 1, offenceType: 1, issuedAt: -1 });
offenceLogSchema.index({ userId: 1, role: 1 });

module.exports = mongoose.model('OffenceLog', offenceLogSchema);
