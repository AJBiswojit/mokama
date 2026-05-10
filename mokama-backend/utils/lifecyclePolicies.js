/**
 * utils/lifecyclePolicies.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for ALL lifecycle timeouts and system policies.
 * Change a value here — the entire system adapts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Timeout policies (all in minutes) ───────────────────────────────────────
const POLICIES = {
  // After worker accepts — employer confirms or auto-confirms
  BOOKING_CONFIRM_TIMEOUT_MINS:     24 * 60,   // 24 hours

  // After booking confirmed + start time — worker must arrive or NO_SHOW
  NO_SHOW_THRESHOLD_MINS:            4 * 60,   // 4 hours past reportTime

  // After worker marks arrived — employer confirms or auto-confirms (CLEAN GPS ONLY)
  ARRIVAL_CONFIRM_TIMEOUT_MINS:         30,    // 30 minutes
  // Suspicious arrivals get longer window — admin reviews
  SUSPICIOUS_ARRIVAL_REVIEW_MINS:      120,    // 2 hours

  // After shift ends — employer marks day complete or auto-completed
  DAY_COMPLETE_TIMEOUT_MINS:          3 * 60,  // 3 hours after shift end

  // After work done (per_hour) — employer approves hours or auto-approved
  HOURLY_APPROVE_TIMEOUT_MINS:       24 * 60,  // 24 hours

  // After payment review window — payment auto-releases
  PAYMENT_REVIEW_WINDOW_MINS:            60,   // 1 hour review window before release

  // After payment released — worker confirms or auto-confirmed
  PAYMENT_CONFIRM_TIMEOUT_MINS:      48 * 60,  // 48 hours

  // After dispute raised — admin resolves or escalates
  DISPUTE_ESCALATION_MINS:           72 * 60,  // 72 hours

  // Reminder email sent halfway through each timeout window
  REMINDER_AT_FRACTION:                 0.5,   // send reminder at 50% of timeout

  // Open jobs with no activity auto-expire
  OPEN_JOB_STALE_DAYS:                  30,

  // Payment fraud: above this amount triggers admin review
  LARGE_PAYMENT_THRESHOLD:            5000,    // ₹5000

  // Max hour adjustment employer can make without admin review
  HOUR_ADJUSTMENT_THRESHOLD:           1.0,    // 1 hour
};

// ─── Anti-fraud / Geofence policies ──────────────────────────────────────────
const FRAUD_POLICIES = {
  // Worker must be within this radius of job site for arrival to be CLEAN
  GEOFENCE_RADIUS_METERS:    500,

  // Below this GPS accuracy, arrival is considered suspicious
  MIN_GPS_ACCURACY_METERS:   100,

  // Arriving more than this many minutes before scheduled time = suspicious
  EARLY_ARRIVAL_THRESHOLD_MINS: 180,   // 3 hours early

  // Auto-confirm only if GPS is clean — suspicious arrivals wait for employer/admin
  REQUIRE_CLEAN_GPS_FOR_AUTO_CONFIRM: true,

  // Payment flags
  DUPLICATE_PAYMENT_WINDOW_HOURS:   24,   // flag if same worker paid twice in 24hrs
};

// ─── Partial restriction rules (on dispute) ───────────────────────────────────
const RESTRICTION_RULES = {
  ON_DISPUTE_RAISED: {
    employer: {
      canCreateNewJobs:    false,   // cannot post new jobs while in dispute
      canReleasePayments:  false,   // cannot release payment outside this job
      canBrowse:           true,    // can still browse
      canViewHistory:      true,    // can see history
      canContactSupport:   true,
    },
    worker: {
      canAcceptNewJobs:    false,   // cannot take new jobs while in dispute
      canReceivePayments:  false,   // cannot receive payment outside this job
      canBrowse:           true,
      canViewHistory:      true,
      canContactSupport:   true,
    },
  },
  ON_DISPUTE_RESOLVED: {
    employer: { canCreateNewJobs: true, canReleasePayments: true },
    worker:   { canAcceptNewJobs: true, canReceivePayments: true },
  },
};

// ─── Shift end times ──────────────────────────────────────────────────────────
function getShiftEndTime(date, job) {
  const d = new Date(date);
  d.setSeconds(0); d.setMilliseconds(0);

  if (job.workShift === 'morning_half') {
    d.setHours(12, 0);
  } else if (job.workShift === 'full_day') {
    d.setHours(17, 0);
  } else if (job.workShift === 'custom' && job.customShiftEnd) {
    const [h, m] = job.customShiftEnd.split(':').map(Number);
    d.setHours(h, m);
  } else {
    d.setHours(17, 0);
  }
  return d;
}

// ─── Time helpers ─────────────────────────────────────────────────────────────
const minutesAgo  = (m) => new Date(Date.now() - m * 60 * 1000);
const daysAgo     = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);
const minutesFromNow = (m) => new Date(Date.now() + m * 60 * 1000);
const isOlderThan = (ts, mins) => ts && new Date(ts) < minutesAgo(mins);

// ─── Haversine distance (meters) ──────────────────────────────────────────────
function distanceBetween(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R    = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    = Math.sin(dLat/2) ** 2
             + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ─── Validate GPS arrival ──────────────────────────────────────────────────────
// Returns { isClean, withinGeofence, distanceMeters, flags[] }
function validateArrivalGPS(workerLat, workerLng, jobLat, jobLng, accuracyMeters, job) {
  const flags = [];

  if (!workerLat || !workerLng) {
    flags.push('no_gps');
    return { isClean: false, withinGeofence: false, distanceMeters: null, flags };
  }

  const distance = jobLat && jobLng
    ? Math.round(distanceBetween(workerLat, workerLng, jobLat, jobLng))
    : null;

  const radius   = job?.geofenceRadiusMeters || FRAUD_POLICIES.GEOFENCE_RADIUS_METERS;
  const withinGeofence = distance !== null ? distance <= radius : null;

  if (!withinGeofence && distance !== null) flags.push('outside_geofence');
  if (accuracyMeters && accuracyMeters > FRAUD_POLICIES.MIN_GPS_ACCURACY_METERS) flags.push('low_accuracy');

  // Early arrival check
  if (job?.reportTime) {
    const [h, m] = job.reportTime.split(':').map(Number);
    const scheduled = new Date(); scheduled.setHours(h, m, 0, 0);
    const earlyMins = (scheduled - Date.now()) / 60000;
    if (earlyMins > FRAUD_POLICIES.EARLY_ARRIVAL_THRESHOLD_MINS) flags.push('too_early');
  }

  const isClean = flags.length === 0;

  return { isClean, withinGeofence, distanceMeters: distance, flags };
}

// ─── Payment fraud check ──────────────────────────────────────────────────────
function checkPaymentFraud(job, amount) {
  const flags = [];
  if (amount > FRAUD_POLICIES.LARGE_PAYMENT_THRESHOLD) flags.push('large_amount');
  return { isSuspicious: flags.length > 0, flags };
}

module.exports = {
  POLICIES,
  FRAUD_POLICIES,
  RESTRICTION_RULES,
  getShiftEndTime,
  minutesAgo,
  minutesFromNow,
  daysAgo,
  isOlderThan,
  distanceBetween,
  validateArrivalGPS,
  checkPaymentFraud,
};
