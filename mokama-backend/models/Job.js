const mongoose = require('mongoose');

// ─── Primary job lifecycle status ─────────────────────────────────────────────
const JOB_STATUS = {
  OPEN:              'OPEN',
  REQUEST_SENT:      'REQUEST_SENT',
  ACCEPTED:          'ACCEPTED',
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  ACTIVE:            'ACTIVE',           // replaces WORK_IN_PROGRESS
  WORK_DONE:         'WORK_DONE',
  COMPLETED:         'COMPLETED',
  CANCELLED:         'CANCELLED',
  EXPIRED:           'EXPIRED',
  NO_SHOW:           'NO_SHOW',
};

// ─── Secondary: payment dimension ─────────────────────────────────────────────
const PAYMENT_STATUS = {
  NONE:           'NONE',
  PENDING_RELEASE:'PENDING_RELEASE',
  ON_HOLD:        'ON_HOLD',             // dispute or fraud flag
  RELEASED:       'RELEASED',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  CONFIRMED:      'CONFIRMED',
  AUTO_CONFIRMED: 'AUTO_CONFIRMED',
};

// ─── Secondary: attendance dimension ──────────────────────────────────────────
const ATTENDANCE_STATUS = {
  AWAITED:        'AWAITED',
  ARRIVED:        'ARRIVED',             // worker marked, unconfirmed
  CONFIRMED:      'CONFIRMED',           // employer confirmed
  AUTO_CONFIRMED: 'AUTO_CONFIRMED',      // 30-min timeout (clean GPS only)
  SUSPICIOUS:     'SUSPICIOUS',          // GPS mismatch / no proof
  NO_SHOW:        'NO_SHOW',
  ABSENT:         'ABSENT',             // pre-notified absence
};

// ─── Secondary: dispute dimension ─────────────────────────────────────────────
const DISPUTE_STATUS = {
  NONE:         'NONE',
  RAISED:       'RAISED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  ESCALATED:    'ESCALATED',
  RESOLVED:     'RESOLVED',
  DISMISSED:    'DISMISSED',
};

// ─── Pending action types ──────────────────────────────────────────────────────
const ACTION_TYPES = {
  CONFIRM_BOOKING:    'confirm_booking',
  MARK_ARRIVED:       'mark_arrived',
  CONFIRM_ARRIVAL:    'confirm_arrival',
  MARK_DAY_COMPLETE:  'mark_day_complete',
  CONFIRM_DAY_PAY:    'confirm_day_pay',
  APPROVE_HOURS:      'approve_hours',
  CONFIRM_PAYMENT:    'confirm_payment',
  RESOLVE_DISPUTE:    'resolve_dispute',
  REVIEW_SUSPICIOUS:  'review_suspicious_arrival',
};

// ─── Day log schema ────────────────────────────────────────────────────────────
const dayLogSchema = new mongoose.Schema({
  date:               { type: Date, required: true },

  // Attendance proof
  arrivedAt:          { type: Date, default: null },
  gpsLat:             { type: Number, default: null },
  gpsLng:             { type: Number, default: null },
  gpsAccuracyMeters:  { type: Number, default: null },
  distanceFromJobMeters: { type: Number, default: null },
  withinGeofence:     { type: Boolean, default: null },  // null = not checked
  photoProofUrl:      { type: String, default: '' },
  isSuspicious:       { type: Boolean, default: false },
  suspicionNote:      { type: String, default: '' },

  // Confirmation
  arrivalConfirmed:      { type: Boolean, default: false },
  arrivalConfirmedAt:    { type: Date, default: null },
  arrivalConfirmedBy:    { type: String, enum: ['employer', 'auto', 'admin'], default: null },

  // Day completion
  dayCompleted:       { type: Boolean, default: false },
  dayCompletedAt:     { type: Date, default: null },
  dayCompletedBy:     { type: String, enum: ['employer', 'auto', 'admin'], default: null },

  // Payment
  payAmount:              { type: Number, default: 0 },
  paymentReleased:        { type: Boolean, default: false },
  paymentReleasedAt:      { type: Date, default: null },
  paymentOnHold:          { type: Boolean, default: false },   // fraud/dispute hold
  paymentConfirmed:       { type: Boolean, default: false },
  paymentConfirmedAt:     { type: Date, default: null },
  paymentConfirmedBy:     { type: String, enum: ['worker', 'auto', 'admin'], default: null },

  // Review window — employer can flag before auto-release
  reviewWindowEnds:       { type: Date, default: null },
  flaggedForReview:       { type: Boolean, default: false },

  dayStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'paid', 'absent', 'suspicious', 'disputed'],
    default: 'pending',
  },
}, { _id: true });

// ─── Payment verification schema ───────────────────────────────────────────────
const paymentVerificationSchema = new mongoose.Schema({
  // Per-hour job final payment
  clockInAt:          { type: Date, default: null },
  clockInGpsLat:      { type: Number, default: null },
  clockInGpsLng:      { type: Number, default: null },
  clockOutAt:         { type: Date, default: null },
  clockOutGpsLat:     { type: Number, default: null },
  clockOutGpsLng:     { type: Number, default: null },

  actualHours:        { type: Number, default: 0 },
  employerAdjustedHours: { type: Number, default: null },  // if employer modifies
  approvedHours:      { type: Number, default: 0 },
  totalAmount:        { type: Number, default: 0 },

  // Multi-step flags
  workerSubmitted:    { type: Boolean, default: false },   // worker marked done
  employerReviewed:   { type: Boolean, default: false },   // employer approved hours
  adminReviewRequired:{ type: Boolean, default: false },   // large adjustment flagged
  adminApproved:      { type: Boolean, default: false },

  paymentReleased:    { type: Boolean, default: false },
  paymentReleasedAt:  { type: Date, default: null },
  paymentOnHold:      { type: Boolean, default: false },
  paymentConfirmed:   { type: Boolean, default: false },
  paymentConfirmedAt: { type: Date, default: null },
  paymentConfirmedBy: { type: String, enum: ['worker', 'auto', 'admin'], default: null },

  // Fraud flags
  isSuspicious:       { type: Boolean, default: false },
  suspicionFlags:     [{ type: String }],  // ['early_checkout', 'gps_mismatch', 'large_amount']
  reviewWindowEnds:   { type: Date, default: null },
}, { _id: false });

// ─── Main Job schema ───────────────────────────────────────────────────────────
const jobSchema = new mongoose.Schema({

  // ── Core ──────────────────────────────────────────────────────────────────
  title:          { type: String, required: true, trim: true },
  workerType:     { type: mongoose.Schema.Types.ObjectId, ref: 'WorkerType', default: null },
  workerTypeName: { type: String, default: '' },
  workersNeeded:  { type: Number, default: 1, min: 1 },
  description:    { type: String, default: '' },
  jobType:        { type: String, enum: ['per_day', 'per_hour'], required: true, default: 'per_day' },

  // ── Location ──────────────────────────────────────────────────────────────
  address:    { type: String, required: true },
  landmark:   { type: String, default: '' },
  state:      { type: String, default: '' },
  district:   { type: String, default: '' },
  block:      { type: String, default: '' },
  pincode:    { type: String, required: true },
  // Job site GPS — used for geofence validation
  jobSiteLat: { type: Number, default: null },
  jobSiteLng: { type: Number, default: null },
  geofenceRadiusMeters: { type: Number, default: 500 },  // default 500m

  // ── Schedule — Per Day ────────────────────────────────────────────────────
  startDate:        { type: Date, required: true },
  numberOfDays:     { type: Number, default: 1, min: 1 },
  endDate:          { type: Date, default: null },
  reportTime:       { type: String, default: '08:00' },
  workShift:        { type: String, enum: ['morning_half', 'full_day', 'custom'], default: 'full_day' },
  customShiftStart: { type: String, default: '' },
  customShiftEnd:   { type: String, default: '' },
  workingDays:      { type: [String], default: ['Mon','Tue','Wed','Thu','Fri','Sat'] },
  breakIncluded:    { type: Boolean, default: true },

  // ── Schedule — Per Hour ───────────────────────────────────────────────────
  arrivalTime:    { type: String, default: '' },
  estimatedHours: { type: Number, default: 0 },
  flexibility:    { type: String, enum: ['exact', 'flexible'], default: 'exact' },

  // ── Pay ───────────────────────────────────────────────────────────────────
  wage:         { type: Number, required: true },
  paymentMode:  { type: String, enum: ['cash', 'upi', 'bank'], default: 'cash' },

  // ── Requirements ──────────────────────────────────────────────────────────
  experienceRequired: { type: String, enum: ['none', '1-2years', '3plus'], default: 'none' },
  genderPreference:   { type: String, enum: ['any', 'male', 'female'], default: 'any' },
  urgency:            { type: String, enum: ['normal', 'urgent'], default: 'normal' },

  // ── Parties ───────────────────────────────────────────────────────────────
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employer', required: true },
  worker:   { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', default: null },

  // ── PRIMARY STATUS ────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: Object.values(JOB_STATUS),
    default: JOB_STATUS.OPEN,
  },

  // ── SECONDARY STATUS DIMENSIONS (decoupled) ───────────────────────────────
  paymentStatus: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.NONE,
  },
  attendanceStatus: {
    type: String,
    enum: Object.values(ATTENDANCE_STATUS),
    default: ATTENDANCE_STATUS.AWAITED,
  },
  disputeStatus: {
    type: String,
    enum: Object.values(DISPUTE_STATUS),
    default: DISPUTE_STATUS.NONE,
  },

  // ── ACTION OWNERSHIP ENGINE ───────────────────────────────────────────────
  // Who needs to act next, by when, and what happens if they don't
  pendingAction: {
    waitingFor:     { type: String, enum: ['employer', 'worker', 'admin', 'system', null], default: null },
    actionType:     { type: String, enum: Object.values(ACTION_TYPES).concat([null]), default: null },
    deadline:       { type: Date, default: null },
    autoResolution: { type: String, default: null },
    setAt:          { type: Date, default: null },
    reminderSentAt: { type: Date, default: null },   // last reminder email sent
    warningCount:   { type: Number, default: 0 },    // how many reminders sent
  },

  // ── OPTIMIZED CRON FIELD ──────────────────────────────────────────────────
  // Indexed — cron ONLY queries jobs where nextActionAt <= now
  nextActionAt: { type: Date, default: null },

  // ── PER DAY: Work log ─────────────────────────────────────────────────────
  workLog:         { type: [dayLogSchema], default: [] },
  totalDaysLogged: { type: Number, default: 0 },
  totalAmountPaid: { type: Number, default: 0 },

  // ── PER HOUR: Payment verification ───────────────────────────────────────
  paymentVerification: { type: paymentVerificationSchema, default: () => ({}) },

  // ── TIMELINE (audit trail for UX) ────────────────────────────────────────
  timeline: [{
    event:      { type: String },             // e.g. 'booking_confirmed'
    actor:      { type: String },             // 'employer' | 'worker' | 'system' | 'admin'
    actorName:  { type: String },
    note:       { type: String },
    ts:         { type: Date, default: Date.now },
  }],

  // ── KEY TIMESTAMPS ────────────────────────────────────────────────────────
  bookingConfirmedAt: { type: Date, default: null },
  firstArrivalAt:     { type: Date, default: null },
  workStartedAt:      { type: Date, default: null },
  workCompletedAt:    { type: Date, default: null },

  // ── DISPUTE ───────────────────────────────────────────────────────────────
  disputeFlag:        { type: Boolean, default: false },
  disputeRaisedBy:    { type: String, enum: ['worker', 'employer', null], default: null },
  disputeRaisedAt:    { type: Date, default: null },
  disputeNote:        { type: String, default: '' },
  disputeResolvedAt:  { type: Date, default: null },
  disputeResolvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  disputeResolution:  { type: String, enum: ['favour_worker', 'favour_employer', 'neutral', null], default: null },
  disputeEscalated:   { type: Boolean, default: false },

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  adminNote:  { type: String, default: '' },
  isHidden:   { type: Boolean, default: false },
  fraudFlag:  { type: Boolean, default: false },
  fraudNote:  { type: String, default: '' },

}, { timestamps: true });

// ─── INDEXES ──────────────────────────────────────────────────────────────────
// Critical: cron uses nextActionAt — must be indexed
jobSchema.index({ nextActionAt: 1, status: 1 });
jobSchema.index({ status: 1, employer: 1 });
jobSchema.index({ status: 1, worker: 1 });
jobSchema.index({ employer: 1, createdAt: -1 });
jobSchema.index({ worker: 1, createdAt: -1 });
jobSchema.index({ disputeStatus: 1, disputeRaisedAt: 1 });

// ─── Statics ──────────────────────────────────────────────────────────────────
jobSchema.statics.JOB_STATUS      = JOB_STATUS;
jobSchema.statics.PAYMENT_STATUS  = PAYMENT_STATUS;
jobSchema.statics.ATTENDANCE_STATUS = ATTENDANCE_STATUS;
jobSchema.statics.DISPUTE_STATUS  = DISPUTE_STATUS;
jobSchema.statics.ACTION_TYPES    = ACTION_TYPES;

module.exports = mongoose.model('Job', jobSchema);
module.exports.JOB_STATUS         = JOB_STATUS;
module.exports.PAYMENT_STATUS     = PAYMENT_STATUS;
module.exports.ATTENDANCE_STATUS  = ATTENDANCE_STATUS;
module.exports.DISPUTE_STATUS     = DISPUTE_STATUS;
module.exports.ACTION_TYPES       = ACTION_TYPES;
