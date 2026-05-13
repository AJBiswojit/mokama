const mongoose = require('mongoose');

// ─── Status constants ─────────────────────────────────────────────────────────
const JOB_STATUS = {
  OPEN:              'OPEN',
  REQUEST_SENT:      'REQUEST_SENT',
  ACCEPTED:          'ACCEPTED',
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  ARRIVED:           'ARRIVED',
  WORK_IN_PROGRESS:  'WORK_IN_PROGRESS',  // active — legacy key kept for backward compat
  ACTIVE:            'ACTIVE',            // active — new alias
  WORKING:           'WORKING',           // oldest legacy alias
  WORK_DONE:         'WORK_DONE',
  PAYMENT_PENDING:   'PAYMENT_PENDING',
  COMPLETED:         'COMPLETED',
  CANCELLED:         'CANCELLED',
  DISPUTED:          'DISPUTED',
  NO_SHOW:           'NO_SHOW',
  EXPIRED:           'EXPIRED',
};

// ─── Per-day daily log entry ──────────────────────────────────────────────────
const dayLogSchema = new mongoose.Schema({
  date:               { type: Date, required: true },

  // Arrival
  arrivedAt:             { type: Date,    default: null },
  arrivalConfirmed:      { type: Boolean, default: false },
  arrivalConfirmedAt:    { type: Date,    default: null },
  arrivalConfirmedBy:    { type: String,  enum: ['employer','auto','admin'], default: null },
  arrivalAutoConfirmed:  { type: Boolean, default: false },

  // GPS / anti-fraud proof
  gpsLat:                { type: Number,  default: null },
  gpsLng:                { type: Number,  default: null },
  gpsAccuracyMeters:     { type: Number,  default: null },
  distanceFromJobMeters: { type: Number,  default: null },
  withinGeofence:        { type: Boolean, default: null },
  photoProofUrl:         { type: String,  default: '' },
  isSuspicious:          { type: Boolean, default: false },
  suspicionNote:         { type: String,  default: '' },

  // Day completion
  dayCompleted:          { type: Boolean, default: false },
  dayCompletedAt:        { type: Date,    default: null },
  dayCompletedBy:        { type: String,  enum: ['employer','auto','admin'], default: null },

  // Daily payment
  payAmount:             { type: Number,  default: 0 },
  paymentReleased:       { type: Boolean, default: false },
  paymentReleasedAt:     { type: Date,    default: null },
  paymentOnHold:         { type: Boolean, default: false },
  paymentConfirmed:      { type: Boolean, default: false },
  paymentConfirmedAt:    { type: Date,    default: null },
  paymentConfirmedBy:    { type: String,  enum: ['worker','auto','admin'], default: null },
  reviewWindowEnds:      { type: Date,    default: null },
  flaggedForReview:      { type: Boolean, default: false },

  dayStatus: {
    type: String,
    enum: ['pending','in_progress','completed','paid','absent','disputed','suspicious'],
    default: 'pending',
  },
  absentNote: { type: String, default: '' },
}, { _id: true });

// ─── Main Job schema ──────────────────────────────────────────────────────────
const jobSchema = new mongoose.Schema({

  // ── Core ──────────────────────────────────────────────────────────────────
  title:          { type: String, required: true, trim: true },
  workerType:     { type: mongoose.Schema.Types.ObjectId, ref: 'WorkerType', default: null },
  workerTypeName: { type: String, default: '' },
  workersNeeded:  { type: Number, default: 1, min: 1 },
  description:    { type: String, default: '' },

  // ── Job Type ─────────────────────────────────────────────────────────────
  jobType: {
    type: String,
    enum: ['per_day', 'per_hour'],
    required: true,
    default: 'per_day',
  },

  // ── Location ──────────────────────────────────────────────────────────────
  address:  { type: String, required: true },
  landmark: { type: String, default: '' },
  state:    { type: String, default: '' },
  district: { type: String, default: '' },
  block:    { type: String, default: '' },
  pincode:  { type: String, required: true },
  // Job-site GPS for geofence validation (anti-fraud arrival proof)
  jobSiteLat:           { type: Number, default: null },
  jobSiteLng:           { type: Number, default: null },
  geofenceRadiusMeters: { type: Number, default: 500 },

  // ── Schedule — Per Day ────────────────────────────────────────────────────
  startDate:        { type: Date, required: true },
  numberOfDays:     { type: Number, default: 1, min: 1 },
  endDate:          { type: Date, default: null },        // auto-calculated on save
  reportTime:       { type: String, default: '08:00' },   // "08:00" HH:MM
  workShift: {
    type: String,
    enum: ['morning_half', 'full_day', 'custom'],
    default: 'full_day',
  },
  customShiftStart: { type: String, default: '' },        // "07:00"
  customShiftEnd:   { type: String, default: '' },        // "17:00"
  workingDays:      { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
  breakIncluded:    { type: Boolean, default: true },

  // ── Schedule — Per Hour ───────────────────────────────────────────────────
  arrivalTime:    { type: String, default: '' },          // "10:00"
  estimatedHours: { type: Number, default: 0 },
  multiDay:       { type: Boolean, default: false },
  flexibility: {
    type: String,
    enum: ['exact', 'flexible'],
    default: 'exact',
  },

  // ── Pay ───────────────────────────────────────────────────────────────────
  wage: { type: Number, required: true },                 // per day OR per hour rate
  paymentMode: {
    type: String,
    enum: ['cash', 'upi', 'bank'],
    default: 'cash',
  },

  // ── Requirements ──────────────────────────────────────────────────────────
  experienceRequired: {
    type: String,
    enum: ['none', '1-2years', '3plus'],
    default: 'none',
  },
  genderPreference: {
    type: String,
    enum: ['any', 'male', 'female'],
    default: 'any',
  },
  urgency: {
    type: String,
    enum: ['normal', 'urgent'],
    default: 'normal',
  },

  // ── Parties ───────────────────────────────────────────────────────────────
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employer', required: true },
  worker:   { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', default: null },

  // ── Primary Status ────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: Object.values(JOB_STATUS),
    default: JOB_STATUS.OPEN,
  },

  // ── Secondary Status Dimensions (decoupled — each tracks its own concern) ─
  paymentStatus: {
    type: String,
    enum: ['NONE','PENDING_RELEASE','ON_HOLD','RELEASED','PARTIALLY_PAID','CONFIRMED','AUTO_CONFIRMED'],
    default: 'NONE',
  },
  attendanceStatus: {
    type: String,
    enum: ['AWAITED','ARRIVED','CONFIRMED','AUTO_CONFIRMED','SUSPICIOUS','NO_SHOW','ABSENT'],
    default: 'AWAITED',
  },
  disputeStatus: {
    type: String,
    enum: ['NONE','RAISED','UNDER_REVIEW','ESCALATED','RESOLVED','DISMISSED'],
    default: 'NONE',
  },

  // ── Action Ownership Engine ────────────────────────────────────────────────
  // Tracks who must act next, by when, and what auto-happens if they don't.
  // Used by cron — only jobs with nextActionAt <= now are ever queried.
  pendingAction: {
    waitingFor:     { type: String, enum: ['employer','worker','admin','system',null], default: null },
    actionType:     { type: String, default: null },
    deadline:       { type: Date,   default: null },
    autoResolution: { type: String, default: null },
    setAt:          { type: Date,   default: null },
    reminderSentAt: { type: Date,   default: null },
    warningCount:   { type: Number, default: 0 },
  },

  // ── Optimized Cron Field (INDEXED) ───────────────────────────────────────
  // Cron ONLY queries: { nextActionAt: { $lte: now } }
  // No full table scans. Set by actionOwnership.setPendingAction().
  nextActionAt: { type: Date, default: null },

  // ── Per Day — Work Log ────────────────────────────────────────────────────
  // One entry per working day, generated when booking is confirmed
  workLog:         { type: [dayLogSchema], default: [] },
  totalDaysLogged: { type: Number, default: 0 },   // days marked paid
  totalAmountPaid: { type: Number, default: 0 },   // cumulative paid so far

  // ── Per Hour — Time Log ───────────────────────────────────────────────────
  timeLog: {
    onTheWayAt:         { type: Date,    default: null },
    startedAt:          { type: Date,    default: null },
    completedAt:        { type: Date,    default: null },
    approvedHours:      { type: Number,  default: 0 },
    totalAmount:        { type: Number,  default: 0 },
    // Payment verification
    employerReviewed:   { type: Boolean, default: false },
    adminReviewRequired:{ type: Boolean, default: false },
    paymentReleased:    { type: Boolean, default: false },
    paymentReleasedAt:  { type: Date,    default: null },
    paymentOnHold:      { type: Boolean, default: false },
    paymentConfirmed:   { type: Boolean, default: false },
    paymentConfirmedAt: { type: Date,    default: null },
    paymentConfirmedBy: { type: String,  enum: ['worker','auto','admin'], default: null },
    // Fraud flags
    isSuspicious:       { type: Boolean, default: false },
    suspicionFlags:     [{ type: String }],
    reviewWindowEnds:   { type: Date,    default: null },
  },

  // ── Key timestamps ────────────────────────────────────────────────────────
  bookingConfirmedAt: { type: Date, default: null },
  arrivedAt:          { type: Date, default: null },  // first arrival
  workStartedAt:      { type: Date, default: null },
  workCompletedAt:    { type: Date, default: null },

  // ── Payment flags ─────────────────────────────────────────────────────────
  paymentConfirmedByEmployer: { type: Boolean, default: false },
  paymentConfirmedByWorker:   { type: Boolean, default: false },

  // ── Timeline (audit trail for UX — shows users why automation happened) ──
  timeline: [{
    event:     { type: String },
    actor:     { type: String },     // 'employer'|'worker'|'system'|'admin'
    actorName: { type: String },
    note:      { type: String },
    ts:        { type: Date, default: Date.now },
  }],

  // ── Key timestamps ────────────────────────────────────────────────────────
  bookingConfirmedAt: { type: Date, default: null },
  arrivedAt:          { type: Date, default: null },
  workStartedAt:      { type: Date, default: null },
  workCompletedAt:    { type: Date, default: null },

  // ── Dispute (from INTEGRATION_GUIDE) ─────────────────────────────────────
  disputeFlag:       { type: Boolean, default: false },
  disputeNote:       { type: String,  default: '' },
  disputeRaisedBy: {
    type: String,
    enum: ['worker', 'employer', null],
    default: null,
  },
  disputeRaisedAt:   { type: Date,    default: null },
  disputeResolvedAt: { type: Date,    default: null },
  disputeResolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  disputeResolution: {
    type: String,
    enum: ['favour_worker', 'favour_employer', 'neutral', null],
    default: null,
  },
  disputeEscalated:  { type: Boolean, default: false },

  // ── Lifecycle auto-action audit trail (from INTEGRATION_GUIDE) ───────────
  // Prevent cron from double-acting on the same job stage
  bookingAutoConfirmed: { type: Boolean, default: false },
  arrivalAutoConfirmed: { type: Boolean, default: false },
  dayAutoCompleted:     { type: Boolean, default: false },
  payAutoReleased:      { type: Boolean, default: false },
  paymentAutoConfirmed: { type: Boolean, default: false },

  // ── Admin ─────────────────────────────────────────────────────────────────
  adminNote:  { type: String,  default: '' },
  isHidden:   { type: Boolean, default: false },
  fraudFlag:  { type: Boolean, default: false },
  fraudNote:  { type: String,  default: '' },

}, { timestamps: true });

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Critical: cron queries nextActionAt — must be indexed for performance
jobSchema.index({ nextActionAt: 1, status: 1 });
jobSchema.index({ status: 1, employer: 1 });
jobSchema.index({ status: 1, worker: 1 });
jobSchema.index({ employer: 1, createdAt: -1 });
jobSchema.index({ worker: 1,   createdAt: -1 });
jobSchema.index({ disputeStatus: 1, disputeRaisedAt: 1 });

// ─── Statics ──────────────────────────────────────────────────────────────────
jobSchema.statics.JOB_STATUS = JOB_STATUS;

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = mongoose.model('Job', jobSchema);
module.exports.JOB_STATUS = JOB_STATUS;
