/**
 * utils/actionOwnership.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single interface for setting who needs to act next on a job.
 * Every transition in jobController calls setPendingAction().
 * Cron reads nextActionAt to find only due jobs — no full scans.
 *
 * This solves the race condition problem: status transitions only happen
 * through this engine, ensuring one clear owner at every stage.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { POLICIES } = require('./lifecyclePolicies');

// ─── Action definitions ───────────────────────────────────────────────────────
// Each action type knows: who waits, what auto-happens, and how long to wait
const ACTION_CONFIG = {
  confirm_booking: {
    waitingFor:     'employer',
    autoResolution: 'auto_confirm_booking',
    timeoutMins:    POLICIES.BOOKING_CONFIRM_TIMEOUT_MINS,
    label:          'Confirm booking',
    workerMessage:  'Waiting for employer to confirm your booking',
    employerMessage:'Please confirm this booking',
  },
  mark_arrived: {
    waitingFor:     'worker',
    autoResolution: 'auto_no_show',
    label:          'Worker to mark arrival',
    workerMessage:  'Mark your arrival at the job site',
    employerMessage:'Waiting for worker to mark arrival',
  },
  confirm_arrival: {
    waitingFor:     'employer',
    autoResolution: 'auto_confirm_arrival',
    timeoutMins:    POLICIES.ARRIVAL_CONFIRM_TIMEOUT_MINS,
    label:          'Confirm worker arrival',
    workerMessage:  'Waiting for employer to confirm your arrival',
    employerMessage:'Please confirm worker arrival (auto-confirms in 30 min)',
  },
  mark_day_complete: {
    waitingFor:     'employer',
    autoResolution: 'auto_complete_day',
    label:          'Mark day complete & release pay',
    workerMessage:  'Waiting for employer to mark today complete',
    employerMessage:'Mark today complete to release daily pay',
  },
  confirm_day_pay: {
    waitingFor:     'worker',
    autoResolution: 'auto_confirm_payment',
    timeoutMins:    POLICIES.PAYMENT_CONFIRM_TIMEOUT_MINS,
    label:          'Confirm daily payment received',
    workerMessage:  'Confirm you received today\'s payment',
    employerMessage:'Waiting for worker to confirm payment receipt',
  },
  approve_hours: {
    waitingFor:     'employer',
    autoResolution: 'auto_approve_hours',
    timeoutMins:    POLICIES.HOURLY_APPROVE_TIMEOUT_MINS,
    label:          'Review and approve hours',
    workerMessage:  'Waiting for employer to approve your hours',
    employerMessage:'Review work hours and release payment',
  },
  confirm_payment: {
    waitingFor:     'worker',
    autoResolution: 'auto_confirm_payment',
    timeoutMins:    POLICIES.PAYMENT_CONFIRM_TIMEOUT_MINS,
    label:          'Confirm payment received',
    workerMessage:  'Confirm you received the payment',
    employerMessage:'Waiting for worker to confirm receipt',
  },
  resolve_dispute: {
    waitingFor:     'admin',
    autoResolution: 'escalate_dispute',
    timeoutMins:    POLICIES.DISPUTE_ESCALATION_MINS,
    label:          'Admin to resolve dispute',
    workerMessage:  'Dispute under admin review',
    employerMessage:'Dispute under admin review',
  },
  review_suspicious_arrival: {
    waitingFor:     'admin',
    autoResolution: 'flag_and_continue',
    timeoutMins:    120,  // 2 hours for admin to review suspicious arrival
    label:          'Admin to verify suspicious arrival',
    workerMessage:  'Your arrival is being verified',
    employerMessage:'Worker arrival flagged for verification',
  },
};

// ─── Set pending action ────────────────────────────────────────────────────────
/**
 * Call this every time a job stage changes.
 * Sets who needs to act, by when, and what auto-happens if they don't.
 *
 * @param {Document} job - Mongoose job document (not saved yet)
 * @param {string}   actionType - key from ACTION_CONFIG
 * @param {Object}   options
 * @param {number}   [options.overrideDeadlineMins] - override the default timeout
 * @param {Date}     [options.absoluteDeadline] - use exact date instead of relative
 */
function setPendingAction(job, actionType, options = {}) {
  const config = ACTION_CONFIG[actionType];
  if (!config) throw new Error(`Unknown actionType: ${actionType}`);

  let deadline;
  if (options.absoluteDeadline) {
    deadline = options.absoluteDeadline;
  } else if (options.overrideDeadlineMins) {
    deadline = new Date(Date.now() + options.overrideDeadlineMins * 60 * 1000);
  } else if (config.timeoutMins) {
    deadline = new Date(Date.now() + config.timeoutMins * 60 * 1000);
  } else {
    deadline = null; // No auto-resolution (e.g., mark_arrived has no timeout — NO_SHOW is date-based)
  }

  job.pendingAction = {
    waitingFor:     config.waitingFor,
    actionType,
    deadline,
    autoResolution: config.autoResolution,
    setAt:          new Date(),
    reminderSentAt: null,
    warningCount:   0,
  };

  // This is the key optimisation field — cron only queries this
  job.nextActionAt = deadline;
}

// ─── Set no-show deadline ──────────────────────────────────────────────────────
// Special case: no-show deadline is based on startDate + threshold, not current time
function setNoShowDeadline(job) {
  const startDate = new Date(job.startDate);

  // Parse reportTime (e.g. "08:00") and apply to startDate
  if (job.reportTime) {
    const [h, m] = job.reportTime.split(':').map(Number);
    startDate.setHours(h, m, 0, 0);
  } else {
    startDate.setHours(8, 0, 0, 0);
  }

  const noShowAt = new Date(
    startDate.getTime() + POLICIES.NO_SHOW_THRESHOLD_MINS * 60 * 1000
  );

  job.pendingAction = {
    waitingFor:     'worker',
    actionType:     'mark_arrived',
    deadline:       noShowAt,
    autoResolution: 'auto_no_show',
    setAt:          new Date(),
    reminderSentAt: null,
    warningCount:   0,
  };
  job.nextActionAt = noShowAt;
}

// ─── Set day-complete deadline ─────────────────────────────────────────────────
// Called when worker marks arrived — deadline is shift end + 3hrs
function setDayCompleteDeadline(job) {
  const { getShiftEndTime } = require('./lifecyclePolicies');
  const today      = new Date(); today.setHours(0,0,0,0);
  const shiftEnd   = getShiftEndTime(today, job);
  const deadline   = new Date(shiftEnd.getTime() + POLICIES.DAY_COMPLETE_TIMEOUT_MINS * 60 * 1000);

  job.pendingAction = {
    waitingFor:     'employer',
    actionType:     'mark_day_complete',
    deadline,
    autoResolution: 'auto_complete_day',
    setAt:          new Date(),
    reminderSentAt: null,
    warningCount:   0,
  };
  job.nextActionAt = deadline;
}

// ─── Clear pending action ──────────────────────────────────────────────────────
// Call this when the expected action is completed
function clearPendingAction(job) {
  job.pendingAction = {
    waitingFor: null, actionType: null,
    deadline: null,   autoResolution: null,
    setAt: null,      reminderSentAt: null,
    warningCount: 0,
  };
  job.nextActionAt = null;
}

// ─── Get time remaining ────────────────────────────────────────────────────────
function getTimeRemaining(job) {
  if (!job.pendingAction?.deadline) return null;
  const ms = new Date(job.pendingAction.deadline) - Date.now();
  if (ms <= 0) return { expired: true, ms: 0, label: 'Overdue' };

  const totalMins = Math.floor(ms / 60000);
  const hrs       = Math.floor(totalMins / 60);
  const mins      = totalMins % 60;

  const label = hrs > 0
    ? `${hrs}h ${mins}m remaining`
    : `${mins}m remaining`;

  return { expired: false, ms, hrs, mins, label };
}

// ─── Get action config (for frontend messaging) ────────────────────────────────
function getActionConfig(actionType) {
  return ACTION_CONFIG[actionType] || null;
}

// ─── Add timeline event ────────────────────────────────────────────────────────
function addTimeline(job, event, actor, actorName, note = '') {
  if (!job.timeline) job.timeline = [];
  job.timeline.push({ event, actor, actorName, note, ts: new Date() });
}

module.exports = {
  setPendingAction,
  setNoShowDeadline,
  setDayCompleteDeadline,
  clearPendingAction,
  getTimeRemaining,
  getActionConfig,
  addTimeline,
  ACTION_CONFIG,
};
