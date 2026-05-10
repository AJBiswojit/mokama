/**
 * cron/jobLifecycle.js
 * ─────────────────────────────────────────────────────────────────────────────
 * OPTIMIZED: Runs every 5 minutes but only queries jobs WHERE nextActionAt <= now.
 * No full table scans. Scales to 100k+ jobs without performance issues.
 *
 * Each job stores exactly what needs to happen and when (pendingAction).
 * This cron is just the executor — it reads the intent and acts.
 *
 * Index required (already in Job.js):
 *   { nextActionAt: 1, status: 1 }
 * ─────────────────────────────────────────────────────────────────────────────
 */

const cron    = require('node-cron');
const Job     = require('../models/Job');
const Worker  = require('../models/Worker');
const Employer= require('../models/Employer');
const { JOB_STATUS, PAYMENT_STATUS, ATTENDANCE_STATUS } = require('../models/Job');
const { POLICIES, getShiftEndTime, validateArrivalGPS } = require('../utils/lifecyclePolicies');
const { applyPenalty, sendReminder }                    = require('../utils/penaltyEngine');
const { clearPendingAction, addTimeline }               = require('../utils/actionOwnership');
const { updateHonourScore }                             = require('../utils/honour');
const { sendEmail }                                     = require('../utils/emailOtp');

// ─── Fetch only jobs that are due ──────────────────────────────────────────────
async function fetchDueJobs() {
  return Job.find({
    nextActionAt: { $lte: new Date() },
    status: { $nin: [JOB_STATUS.COMPLETED, JOB_STATUS.CANCELLED, JOB_STATUS.EXPIRED] },
  }).select('_id title status jobType employer worker wage'
    + ' pendingAction nextActionAt workLog paymentVerification'
    + ' workShift customShiftEnd reportTime startDate numberOfDays'
    + ' geofenceRadiusMeters jobSiteLat jobSiteLng workingDays'
    + ' attendanceStatus paymentStatus disputeStatus timeline'
    + ' totalAmountPaid totalDaysLogged adminNote'
    + ' disputeRaisedAt disputeEscalated bookingConfirmedAt'
  );
}

// ─── Reminder logic ────────────────────────────────────────────────────────────
// Send one reminder at the halfway point of the timeout window
function shouldSendReminder(job) {
  const pa = job.pendingAction;
  if (!pa?.deadline || !pa?.setAt || pa.reminderSentAt) return false;

  const totalWindow = new Date(pa.deadline) - new Date(pa.setAt);
  const elapsed     = Date.now() - new Date(pa.setAt);
  const halfway     = totalWindow * POLICIES.REMINDER_AT_FRACTION;

  return elapsed >= halfway;
}

async function sendReminderIfDue(job) {
  if (!shouldSendReminder(job)) return;

  const pa      = job.pendingAction;
  const minsLeft= Math.round((new Date(pa.deadline) - Date.now()) / 60000);
  const timeLabel = minsLeft > 60
    ? `${Math.round(minsLeft/60)}h ${minsLeft % 60}m`
    : `${minsLeft} min`;

  const role     = pa.waitingFor;
  const userId   = role === 'employer' ? job.employer : job.worker;
  const Model    = role === 'employer' ? Employer : Worker;

  const messages = {
    confirm_booking:   `Your booking for "${job.title}" needs confirmation. Auto-confirms in ${timeLabel}.`,
    confirm_arrival:   `Please confirm worker arrival for "${job.title}". Auto-confirms in ${timeLabel}.`,
    mark_day_complete: `Please mark today complete for "${job.title}" and release daily pay. Auto in ${timeLabel}.`,
    approve_hours:     `Please review and approve hours for "${job.title}". Auto-released in ${timeLabel}.`,
    confirm_payment:   `Please confirm payment received for "${job.title}". Auto-confirmed in ${timeLabel}.`,
    confirm_day_pay:   `Please confirm daily payment received for "${job.title}". Auto-confirmed in ${timeLabel}.`,
  };

  const message = messages[pa.actionType] || `Action required for "${job.title}" — deadline in ${timeLabel}.`;
  await sendReminder(userId, role, job.title, message);

  job.pendingAction.reminderSentAt = new Date();
  job.pendingAction.warningCount   = (job.pendingAction.warningCount || 0) + 1;
  await job.save();
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

// 1. BOOKING AUTO-CONFIRM
async function handleBookingAutoConfirm(job) {
  const dayMap = { Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6 };
  const active = new Set((job.workingDays || ['Mon','Tue','Wed','Thu','Fri','Sat']).map(d => dayMap[d]));

  if (job.jobType === 'per_day' && job.workLog.length === 0) {
    const cursor = new Date(job.startDate); cursor.setHours(0,0,0,0);
    let added = 0, iters = 0;
    while (added < (job.numberOfDays || 1) && iters < 120) {
      iters++;
      if (active.size === 0 || active.has(cursor.getDay())) {
        job.workLog.push({ date: new Date(cursor), payAmount: job.wage, dayStatus: 'pending' });
        added++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  job.status             = JOB_STATUS.BOOKING_CONFIRMED;
  job.bookingConfirmedAt = new Date();
  clearPendingAction(job);
  addTimeline(job, 'booking_auto_confirmed', 'system', 'MoKama', 'Auto-confirmed after 24h — employer did not respond');
  job.adminNote += `\n[AUTO] Booking auto-confirmed ${new Date().toISOString()}`;
  await job.save();

  await applyPenalty(job.employer, 'employer', 'LATE_LOG', job._id, job.title);

  const noShowAt = new Date(new Date(job.startDate).setHours(...(job.reportTime || '08:00').split(':').map(Number), 0, 0));
  noShowAt.setMinutes(noShowAt.getMinutes() + POLICIES.NO_SHOW_THRESHOLD_MINS);
  job.pendingAction = { waitingFor:'worker', actionType:'mark_arrived', deadline:noShowAt, autoResolution:'auto_no_show', setAt:new Date() };
  job.nextActionAt  = noShowAt;
  await job.save();

  console.log(`[lifecycle] ✅ Booking auto-confirmed: ${job._id}`);
}

// 2. NO-SHOW
async function handleNoShow(job) {
  job.status           = JOB_STATUS.NO_SHOW;
  job.attendanceStatus = ATTENDANCE_STATUS.NO_SHOW;
  clearPendingAction(job);
  addTimeline(job, 'no_show', 'system', 'MoKama', 'Worker did not arrive within 4hrs of scheduled start');
  job.adminNote += `\n[AUTO] No-show detected ${new Date().toISOString()}`;
  await job.save();

  await applyPenalty(job.worker, 'worker', 'NO_SHOW', job._id, job.title);
  await Worker.findByIdAndUpdate(job.worker, { $inc: { noShowCount: 1 } });

  // Reset to OPEN — employer can find another worker
  job.status = JOB_STATUS.OPEN; job.worker = null;
  clearPendingAction(job);
  await job.save();
  console.log(`[lifecycle] 🚫 No-show: ${job._id}`);
}

// 3. ARRIVAL AUTO-CONFIRM (only if GPS was clean)
async function handleArrivalAutoConfirm(job) {
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const todayLog = job.workLog.find(l => new Date(l.date) >= today && new Date(l.date) < tomorrow);

  if (!todayLog || !todayLog.arrivedAt) return;

  // SAFETY: Only auto-confirm if arrival GPS was clean
  if (todayLog.isSuspicious) {
    console.log(`[lifecycle] ⚠️ Skipping auto-confirm for suspicious arrival: ${job._id}`);
    // Already handled by review_suspicious — do nothing here
    return;
  }

  const now = new Date();
  todayLog.arrivalConfirmed   = true;
  todayLog.arrivalConfirmedAt = now;
  todayLog.arrivalConfirmedBy = 'auto';
  todayLog.dayStatus          = 'in_progress';

  job.status           = JOB_STATUS.ACTIVE;
  job.attendanceStatus = ATTENDANCE_STATUS.AUTO_CONFIRMED;
  job.workStartedAt    = job.workStartedAt || now;
  addTimeline(job, 'arrival_auto_confirmed', 'system', 'MoKama', 'Auto-confirmed after 30min — employer did not respond');
  job.adminNote += `\n[AUTO] Arrival auto-confirmed ${now.toISOString()}`;

  // Next action: employer must mark day complete
  const shiftEnd = getShiftEndTime(today, job);
  const dayCompleteAt = new Date(shiftEnd.getTime() + POLICIES.DAY_COMPLETE_TIMEOUT_MINS * 60 * 1000);
  job.pendingAction = { waitingFor:'employer', actionType:'mark_day_complete', deadline:dayCompleteAt, autoResolution:'auto_complete_day', setAt:now };
  job.nextActionAt  = dayCompleteAt;
  await job.save();

  console.log(`[lifecycle] ✅ Arrival auto-confirmed: ${job._id}`);
}

// 4. DAY AUTO-COMPLETE
async function handleDayAutoComplete(job) {
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const todayLog = job.workLog.find(l => new Date(l.date) >= today && new Date(l.date) < tomorrow);

  if (!todayLog || todayLog.dayCompleted || !todayLog.arrivalConfirmed) return;

  const now = new Date();
  todayLog.dayCompleted      = true;
  todayLog.dayCompletedAt    = now;
  todayLog.dayCompletedBy    = 'auto';
  todayLog.paymentReleased   = true;
  todayLog.paymentReleasedAt = now;
  todayLog.reviewWindowEnds  = null;  // auto-complete skips review window
  todayLog.dayStatus         = 'completed';

  const completedDays  = job.workLog.filter(l => l.dayCompleted).length;
  const isFinalDay     = completedDays >= job.workLog.length;

  job.paymentStatus = PAYMENT_STATUS.PARTIALLY_PAID;
  if (isFinalDay) {
    job.status          = JOB_STATUS.WORK_DONE;
    job.workCompletedAt = now;
  }
  addTimeline(job, 'day_auto_completed', 'system', 'MoKama', `Day ${completedDays} auto-completed after 3hrs`);
  job.adminNote += `\n[AUTO] Day ${completedDays} auto-completed ${now.toISOString()}`;

  // Next: worker must confirm daily pay
  const confirmAt = new Date(now.getTime() + POLICIES.PAYMENT_CONFIRM_TIMEOUT_MINS * 60 * 1000);
  job.pendingAction = { waitingFor:'worker', actionType:'confirm_day_pay', deadline:confirmAt, autoResolution:'auto_confirm_payment', setAt:now };
  job.nextActionAt  = confirmAt;
  await job.save();

  await applyPenalty(job.employer, 'employer', 'LATE_LOG', job._id, job.title);
  console.log(`[lifecycle] ✅ Day ${completedDays} auto-completed: ${job._id}`);
}

// 5. HOURLY PAY AUTO-RELEASE
async function handleHourlyAutoApprove(job) {
  const pv     = job.paymentVerification;
  const start  = pv?.clockInAt || job.workStartedAt;
  const end    = pv?.clockOutAt || job.workCompletedAt;

  const actualHours = start && end
    ? parseFloat(((new Date(end) - new Date(start)) / 3600000).toFixed(2))
    : parseFloat(process.env.DEFAULT_HOURLY_FALLBACK || '1');
  const totalAmount = parseFloat((actualHours * job.wage).toFixed(2));

  job.paymentVerification.approvedHours    = actualHours;
  job.paymentVerification.totalAmount      = totalAmount;
  job.paymentVerification.employerReviewed = true;
  job.paymentVerification.paymentReleased  = true;
  job.paymentVerification.paymentReleasedAt= new Date();
  job.paymentStatus = PAYMENT_STATUS.RELEASED;
  job.status        = JOB_STATUS.WORK_DONE;
  addTimeline(job, 'hours_auto_approved', 'system', 'MoKama', `Auto-approved ${actualHours}hrs after 24h`);
  job.adminNote += `\n[AUTO] Hours auto-approved ${actualHours}hrs = ₹${totalAmount} ${new Date().toISOString()}`;

  const confirmAt = new Date(Date.now() + POLICIES.PAYMENT_CONFIRM_TIMEOUT_MINS * 60 * 1000);
  job.pendingAction = { waitingFor:'worker', actionType:'confirm_payment', deadline:confirmAt, autoResolution:'auto_confirm_payment', setAt:new Date() };
  job.nextActionAt  = confirmAt;
  await job.save();

  await applyPenalty(job.employer, 'employer', 'LATE_APPROVAL', job._id, job.title);
  console.log(`[lifecycle] ✅ Hourly pay auto-released: ₹${totalAmount}, job ${job._id}`);
}

// 6. PAYMENT AUTO-CONFIRM (per_hour)
async function handleHourlyPaymentAutoConfirm(job) {
  const now    = new Date();
  const total  = job.paymentVerification?.totalAmount || 0;

  job.paymentVerification.paymentConfirmed   = true;
  job.paymentVerification.paymentConfirmedAt = now;
  job.paymentVerification.paymentConfirmedBy = 'auto';
  job.paymentStatus = PAYMENT_STATUS.AUTO_CONFIRMED;
  job.status        = JOB_STATUS.COMPLETED;
  job.totalAmountPaid = total;
  clearPendingAction(job);
  addTimeline(job, 'payment_auto_confirmed', 'system', 'MoKama', 'Payment auto-confirmed after 48h');
  job.adminNote += `\n[AUTO] Payment auto-confirmed ${now.toISOString()}`;
  await job.save();

  await Promise.all([
    updateHonourScore(job.employer, 'employer', 'TIMELY_PAYMENT'),
    updateHonourScore(job.worker,   'worker',   'JOB_COMPLETED'),
    Employer.findByIdAndUpdate(job.employer, { $inc: { completedJobs:1, activeJobs:-1 } }),
    Worker.findByIdAndUpdate(job.worker,     { $inc: { completedJobs:1 } }),
  ]);
  console.log(`[lifecycle] ✅ Hourly payment auto-confirmed: ${job._id}`);
}

// 7. PER-DAY: payment auto-confirm for individual day log entries
async function handlePerDayPaymentAutoConfirm(job) {
  const now     = new Date();
  let changed   = false;

  for (const log of job.workLog) {
    if (!log.paymentReleased || log.paymentConfirmed || log.flaggedForReview) continue;
    const releasedAgo = now - new Date(log.paymentReleasedAt);
    if (releasedAgo < POLICIES.PAYMENT_CONFIRM_TIMEOUT_MINS * 60 * 1000) continue;

    log.paymentConfirmed   = true;
    log.paymentConfirmedAt = now;
    log.paymentConfirmedBy = 'auto';
    log.dayStatus          = 'paid';
    job.totalAmountPaid   += log.payAmount;
    job.totalDaysLogged   += 1;
    changed = true;
  }

  if (!changed) return;

  const allPaid = job.workLog.every(l => l.paymentConfirmed || l.dayStatus === 'absent');
  if (allPaid) {
    job.status        = JOB_STATUS.COMPLETED;
    job.paymentStatus = PAYMENT_STATUS.AUTO_CONFIRMED;
    clearPendingAction(job);
    addTimeline(job, 'job_completed', 'system', 'MoKama', 'All days paid — job closed');
    await Promise.all([
      updateHonourScore(job.employer, 'employer', 'TIMELY_PAYMENT'),
      updateHonourScore(job.worker,   'worker',   'JOB_COMPLETED'),
      Employer.findByIdAndUpdate(job.employer, { $inc: { completedJobs:1, activeJobs:-1 } }),
      Worker.findByIdAndUpdate(job.worker,     { $inc: { completedJobs:1 } }),
    ]);
  }

  await job.save();
  console.log(`[lifecycle] ✅ Per-day payment(s) auto-confirmed: ${job._id}`);
}

// 8. DISPUTE ESCALATION
async function handleDisputeEscalation(job) {
  job.disputeEscalated = true;
  job.adminNote += `\n[AUTO] Dispute escalated after 72h ${new Date().toISOString()}`;
  addTimeline(job, 'dispute_escalated', 'system', 'MoKama', 'Dispute unresolved for 72h — admin flagged');
  await job.save();

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    sendEmail(adminEmail, `🚨 Dispute Escalated — ${job.title} | MoKama`,
      `<div style="font-family:Arial;background:#0a0a0a;color:#f0f0f0;padding:24px;border-radius:12px;">
        <h2 style="color:#ff2400;">Dispute Escalated — Immediate Action Required</h2>
        <p>Job: <strong>${job.title}</strong> (ID: ${job._id})</p>
        <p>Dispute unresolved for 72+ hours. Both accounts have restricted actions.</p>
        <a href="${process.env.FRONTEND_URL}/admin/dashboard"
           style="display:inline-block;padding:12px 24px;background:#ff2400;
                  color:white;border-radius:8px;text-decoration:none;font-weight:bold;">
          Resolve in Admin Panel
        </a>
      </div>`
    ).catch(() => {});
  }
  console.log(`[lifecycle] 🚨 Dispute escalated: ${job._id}`);
}

// 9. STALE OPEN JOB CLEANUP
async function cleanStaleOpenJobs() {
  const cutoff = new Date(Date.now() - POLICIES.OPEN_JOB_STALE_DAYS * 24 * 60 * 60 * 1000);
  const result = await Job.updateMany(
    { status: JOB_STATUS.OPEN, createdAt: { $lt: cutoff }, nextActionAt: null },
    { $set: { status: JOB_STATUS.EXPIRED, adminNote: '[AUTO] Expired after 30 days inactivity' } }
  );
  if (result.modifiedCount > 0)
    console.log(`[lifecycle] 🗑 Stale open jobs expired: ${result.modifiedCount}`);
  return result.modifiedCount;
}

// ─── MAIN DISPATCHER ──────────────────────────────────────────────────────────
async function processJob(job) {
  const resolution = job.pendingAction?.autoResolution;
  if (!resolution) return;

  // Send reminder if at halfway point (non-destructive)
  await sendReminderIfDue(job);

  // Only act if deadline has actually passed
  if (job.nextActionAt && new Date(job.nextActionAt) > new Date()) return;

  switch (resolution) {
    case 'auto_confirm_booking':   return handleBookingAutoConfirm(job);
    case 'auto_no_show':           return handleNoShow(job);
    case 'auto_confirm_arrival':   return handleArrivalAutoConfirm(job);
    case 'auto_complete_day':      return handleDayAutoComplete(job);
    case 'auto_approve_hours':     return handleHourlyAutoApprove(job);
    case 'auto_confirm_payment':
      if (job.jobType === 'per_hour') return handleHourlyPaymentAutoConfirm(job);
      if (job.jobType === 'per_day')  return handlePerDayPaymentAutoConfirm(job);
      break;
    case 'escalate_dispute':       return handleDisputeEscalation(job);
    default:
      console.warn(`[lifecycle] Unknown autoResolution: ${resolution} for job ${job._id}`);
  }
}

// ─── CRON RUNNER ──────────────────────────────────────────────────────────────
async function runLifecycleChecks() {
  // OPTIMIZED: Only load jobs that are actually due
  const dueJobs = await fetchDueJobs();

  if (dueJobs.length === 0) return;  // Nothing to do — return immediately

  console.log(`[lifecycle] Processing ${dueJobs.length} due job(s) at ${new Date().toISOString()}`);

  const results = await Promise.allSettled(dueJobs.map(job => processJob(job)));
  results.forEach((r, i) => {
    if (r.status === 'rejected')
      console.error(`[lifecycle] ❌ Job ${dueJobs[i]._id} failed:`, r.reason?.message);
  });

  // Run stale cleanup separately (daily is enough, but it's cheap so run with cron)
  await cleanStaleOpenJobs().catch(e => console.error('[lifecycle] stale cleanup failed:', e.message));
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
function startLifecycleCron() {
  cron.schedule('*/5 * * * *', async () => {
    try { await runLifecycleChecks(); }
    catch (e) { console.error('[lifecycle] CRON CRASH:', e.message); }
  });

  setTimeout(() => runLifecycleChecks().catch(e =>
    console.error('[lifecycle] startup run failed:', e.message)
  ), 10_000);

  console.log('[lifecycle] ✅ Event-driven lifecycle cron started (every 5 min, index-optimized)');
}

module.exports = { startLifecycleCron, runLifecycleChecks };
