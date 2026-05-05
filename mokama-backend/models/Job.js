const mongoose = require('mongoose');

// ─── Status constants ─────────────────────────────────────────────────────────
const JOB_STATUS = {
  OPEN:              'OPEN',              // job posted, visible
  REQUEST_SENT:      'REQUEST_SENT',      // employer sent request to worker
  ACCEPTED:          'ACCEPTED',          // worker accepted
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED', // employer locked the booking    [NEW]
  ARRIVED:           'ARRIVED',           // worker marked arrived on site  [NEW]
  WORK_IN_PROGRESS:  'WORK_IN_PROGRESS',  // work actively happening        [NEW]
  WORK_DONE:         'WORK_DONE',         // employer marked job complete   [NEW]
  PAYMENT_PENDING:   'PAYMENT_PENDING',   // awaiting final payment
  COMPLETED:         'COMPLETED',         // both confirmed, scores updated
  CANCELLED:         'CANCELLED',
  DISPUTED:          'DISPUTED',          // raised by either party         [NEW]
  NO_SHOW:           'NO_SHOW',           // worker never arrived           [NEW]
  EXPIRED:           'EXPIRED',           // auto-expired by cron
};

// ─── Per-day daily log entry ──────────────────────────────────────────────────
const dayLogSchema = new mongoose.Schema({
  date:               { type: Date, required: true },

  // Arrival
  arrivedAt:          { type: Date, default: null },
  arrivalConfirmed:   { type: Boolean, default: false },  // employer confirmed or auto
  arrivalConfirmedAt: { type: Date, default: null },

  // Day completion
  dayCompleted:       { type: Boolean, default: false },
  dayCompletedAt:     { type: Date, default: null },

  // Daily payment
  payAmount:          { type: Number, default: 0 },       // pay for this day
  paymentReleased:    { type: Boolean, default: false },   // employer released
  paymentReleasedAt:  { type: Date, default: null },
  paymentConfirmed:   { type: Boolean, default: false },   // worker confirmed receipt
  paymentConfirmedAt: { type: Date, default: null },

  dayStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'paid', 'absent', 'disputed'],
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

  // ── Status ────────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: Object.values(JOB_STATUS),
    default: JOB_STATUS.OPEN,
  },

  // ── Per Day — Work Log ────────────────────────────────────────────────────
  // One entry per working day, generated when booking is confirmed
  workLog:         { type: [dayLogSchema], default: [] },
  totalDaysLogged: { type: Number, default: 0 },   // days marked paid
  totalAmountPaid: { type: Number, default: 0 },   // cumulative paid so far

  // ── Per Hour — Time Log ───────────────────────────────────────────────────
  timeLog: {
    onTheWayAt:    { type: Date, default: null },
    startedAt:     { type: Date, default: null },
    completedAt:   { type: Date, default: null },
    approvedHours: { type: Number, default: 0 },
    totalAmount:   { type: Number, default: 0 },
  },

  // ── Key timestamps ────────────────────────────────────────────────────────
  bookingConfirmedAt: { type: Date, default: null },
  arrivedAt:          { type: Date, default: null },  // first arrival
  workStartedAt:      { type: Date, default: null },
  workCompletedAt:    { type: Date, default: null },

  // ── Payment flags ─────────────────────────────────────────────────────────
  paymentConfirmedByEmployer: { type: Boolean, default: false },
  paymentConfirmedByWorker:   { type: Boolean, default: false },

  // ── Admin ─────────────────────────────────────────────────────────────────
  disputeFlag: { type: Boolean, default: false },
  disputeNote: { type: String, default: '' },
  adminNote:   { type: String, default: '' },
  isHidden:    { type: Boolean, default: false },

}, { timestamps: true });

// ─── Static ───────────────────────────────────────────────────────────────────
jobSchema.statics.JOB_STATUS = JOB_STATUS;

module.exports = mongoose.model('Job', jobSchema);
module.exports.JOB_STATUS = JOB_STATUS;
