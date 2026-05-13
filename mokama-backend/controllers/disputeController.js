/**
 * controllers/disputeController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * REDESIGNED: Disputes now apply PARTIAL restrictions — not full account freeze.
 *
 * On dispute raised:
 *  - Employer: cannot create new jobs, cannot release payments
 *  - Worker:   cannot accept new jobs, cannot receive payments
 *  - Both:     can browse, view history, contact support
 *
 * Payment on the disputed job is put ON_HOLD — not lost.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Job      = require('../models/Job');
const Worker   = require('../models/Worker');
const Employer = require('../models/Employer');
const OffenceLog = require('../models/OffenceLog');
const { JOB_STATUS } = require('../models/Job');

const DISPUTE_STATUS = {
  NONE:         'NONE',
  RAISED:       'RAISED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  ESCALATED:    'ESCALATED',
  RESOLVED:     'RESOLVED',
  DISMISSED:    'DISMISSED',
};

const PAYMENT_STATUS = {
  NONE:            'NONE',
  PENDING_RELEASE: 'PENDING_RELEASE',
  ON_HOLD:         'ON_HOLD',
  RELEASED:        'RELEASED',
  PARTIALLY_PAID:  'PARTIALLY_PAID',
  CONFIRMED:       'CONFIRMED',
  AUTO_CONFIRMED:  'AUTO_CONFIRMED',
};
const { updateHonourScore }   = require('../utils/honour');
const { applyPenalty }        = require('../utils/penaltyEngine');
const { logAdminAction }      = require('../utils/adminLog');
const { clearPendingAction, addTimeline, setPendingAction } = require('../utils/actionOwnership');
const { sendEmail }           = require('../utils/emailOtp');
const { POLICIES }            = require('../utils/lifecyclePolicies');

// ─── Apply partial restrictions ───────────────────────────────────────────────
async function applyDisputeRestrictions(workerId, employerId) {
  await Promise.all([
    Worker.findByIdAndUpdate(workerId, {
      $set: {
        'restrictions.canAcceptNewJobs':   false,
        'restrictions.canReceivePayments': false,
        'restrictions.canBrowse':          true,
        'restrictions.canViewHistory':     true,
        'restrictions.canContactSupport':  true,
        'restrictions.restrictionReason':  'Active dispute under review',
        'restrictions.restrictedAt':       new Date(),
      }
    }),
    Employer.findByIdAndUpdate(employerId, {
      $set: {
        'restrictions.canCreateNewJobs':   false,
        'restrictions.canReleasePayments': false,
        'restrictions.canBrowse':          true,
        'restrictions.canViewHistory':     true,
        'restrictions.canContactSupport':  true,
        'restrictions.restrictionReason':  'Active dispute under review',
        'restrictions.restrictedAt':       new Date(),
      }
    }),
  ]);
}

// ─── Lift restrictions ────────────────────────────────────────────────────────
async function liftDisputeRestrictions(workerId, employerId) {
  const cleared = {
    'restrictions.canAcceptNewJobs':   true,
    'restrictions.canReceivePayments': true,
    'restrictions.canCreateNewJobs':   true,
    'restrictions.canReleasePayments': true,
    'restrictions.restrictionReason':  null,
    'restrictions.restrictedAt':       null,
  };
  await Promise.all([
    Worker.findByIdAndUpdate(workerId,     { $set: cleared }),
    Employer.findByIdAndUpdate(employerId, { $set: cleared }),
  ]);
}

// ─── Notify helper ────────────────────────────────────────────────────────────
async function notify(userId, Model, subject, body) {
  try {
    const user = await Model.findById(userId).select('name email');
    if (user?.email) {
      await sendEmail(user.email, subject,
        `<div style="font-family:Arial;max-width:520px;margin:0 auto;background:#0a0a0a;
                    color:#f0f0f0;padding:32px;border-radius:16px;border:1px solid #222;">
          <h2 style="color:#ff2400;margin:0 0 16px;">MoKama — Dispute Notice</h2>
          <p style="margin:0;line-height:1.7;color:#a0a0a0;">${body}</p>
          <a href="${process.env.FRONTEND_URL}"
             style="display:inline-block;margin-top:20px;padding:12px 28px;
                    background:#ff2400;color:white;border-radius:8px;
                    text-decoration:none;font-weight:bold;">
            Open MoKama
          </a>
        </div>`
      );
    }
  } catch { /* fire-and-forget */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// RAISE DISPUTE
// POST /jobs/:jobId/dispute
// ─────────────────────────────────────────────────────────────────────────────
exports.raiseDispute = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim())
      return res.status(400).json({ success: false, message: 'Reason is required' });

    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const isWorker   = job.worker?.toString()   === req.user._id.toString();
    const isEmployer = job.employer?.toString()  === req.user._id.toString();
    if (!isWorker && !isEmployer)
      return res.status(403).json({ success: false, message: 'Not a party to this job' });

    const allowedStatuses = [
      JOB_STATUS.ACTIVE,
      JOB_STATUS.WORK_DONE,
      'ACTIVE',
      'WORK_IN_PROGRESS',   // legacy value — backward compat
      'PAYMENT_PENDING',
      'ARRIVED',
    ];
    if (!allowedStatuses.includes(job.status))
      return res.status(400).json({ success: false, message: `Cannot dispute a job with status: ${job.status}` });

    if (job.disputeStatus === DISPUTE_STATUS.RAISED)
      return res.status(400).json({ success: false, message: 'Dispute already raised' });

    const raisedBy = isWorker ? 'worker' : 'employer';
    const now      = new Date();

    // Put payment on hold — not cancelled, just frozen
    job.paymentStatus = PAYMENT_STATUS.ON_HOLD;

    // Freeze payment for any unreleased day logs
    for (const log of job.workLog) {
      if (!log.paymentReleased) log.paymentOnHold = true;
    }
    if (job.paymentVerification && !job.paymentVerification.paymentReleased) {
      job.paymentVerification.paymentOnHold = true;
    }

    job.disputeStatus    = DISPUTE_STATUS.RAISED;
    job.disputeFlag      = true;
    job.disputeRaisedBy  = raisedBy;
    job.disputeRaisedAt  = now;
    job.disputeNote      = reason.trim();
    job.adminNote       += `\n[DISPUTE] Raised by ${raisedBy} at ${now.toISOString()}: ${reason.trim()}`;
    addTimeline(job, 'dispute_raised', raisedBy, req.user.name, reason.trim());

    // Set escalation deadline
    setPendingAction(job, 'resolve_dispute');
    await job.save();

    // Apply PARTIAL restrictions — not full freeze
    await applyDisputeRestrictions(job.worker, job.employer);

    // Notify other party
    if (isWorker) {
      await notify(job.employer, Employer,
        '⚠️ Dispute Raised | MoKama',
        `A dispute has been raised for job <strong>${job.title}</strong>.<br/>
         <em>Reason: ${reason}</em><br/><br/>
         <strong>What this means for you:</strong><br/>
         • You cannot create new jobs while this is under review<br/>
         • You cannot release payments on other jobs<br/>
         • You can still browse, view history, and contact support<br/><br/>
         Admin will review and resolve within 72 hours.`
      );
    } else {
      await notify(job.worker, Worker,
        '⚠️ Dispute Raised | MoKama',
        `A dispute has been raised for job <strong>${job.title}</strong>.<br/>
         <em>Reason: ${reason}</em><br/><br/>
         <strong>What this means for you:</strong><br/>
         • You cannot accept new jobs while this is under review<br/>
         • Payment for this job is on hold pending resolution<br/>
         • You can still browse, view history, and contact support<br/><br/>
         Admin will review and resolve within 72 hours.`
      );
    }

    res.json({
      success: true,
      message: 'Dispute raised. Certain actions are temporarily restricted pending admin review.',
      restrictions: {
        note: 'You can still browse, view history, and contact support',
        affected: raisedBy === 'worker'
          ? ['Accepting new jobs', 'Receiving payments']
          : ['Creating new jobs', 'Releasing payments'],
      },
      estimatedResolution: '72 hours',
      job,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL DISPUTES  [Admin]
// GET /disputes?resolved=false&page=1&limit=20
// ─────────────────────────────────────────────────────────────────────────────
exports.getDisputes = async (req, res) => {
  try {
    const { resolved = 'false', page = 1, limit = 20, urgent } = req.query;
    const query = { disputeFlag: true };

    if (resolved === 'true') {
      query.disputeStatus = { $in: [DISPUTE_STATUS.RESOLVED, DISPUTE_STATUS.DISMISSED] };
    } else {
      query.disputeStatus = { $in: [DISPUTE_STATUS.RAISED, DISPUTE_STATUS.UNDER_REVIEW, DISPUTE_STATUS.ESCALATED] };
    }

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate('worker',   'name mobile honourScore noShowCount')
        .populate('employer', 'name mobile honourScore employerCategoryName')
        .sort({ disputeRaisedAt: 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Job.countDocuments(query),
    ]);

    const now = Date.now();
    const enriched = jobs.map(j => {
      const ageHrs   = j.disputeRaisedAt ? Math.floor((now - new Date(j.disputeRaisedAt)) / 3600000) : 0;
      const timeLeft = j.nextActionAt ? Math.max(0, Math.floor((new Date(j.nextActionAt) - now) / 3600000)) : null;
      return {
        ...j.toObject(),
        disputeAgeHours:     ageHrs,
        timeUntilEscalation: timeLeft,
        isUrgent:            ageHrs >= 48,
        isCritical:          j.disputeStatus === DISPUTE_STATUS.ESCALATED,
      };
    });

    // Sort: escalated first, then urgent, then by age
    enriched.sort((a, b) => {
      if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1;
      if (a.isUrgent   !== b.isUrgent)   return a.isUrgent   ? -1 : 1;
      return b.disputeAgeHours - a.disputeAgeHours;
    });

    res.json({ success: true, disputes: enriched, total, page: parseInt(page) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE DISPUTE  [Admin]
// ─────────────────────────────────────────────────────────────────────────────
exports.getDisputeDetail = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId)
      .populate('worker',   'name mobile honourScore address district completedJobs noShowCount')
      .populate('employer', 'name mobile honourScore employerCategoryName completedJobs');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (!job.disputeFlag) return res.status(400).json({ success: false, message: 'No dispute on this job' });

    // Offence histories for both parties
    const [workerOffences, employerOffences] = await Promise.all([
      OffenceLog.find({ userId: job.worker._id }).sort({ issuedAt: -1 }).limit(10),
      OffenceLog.find({ userId: job.employer._id }).sort({ issuedAt: -1 }).limit(10),
    ]);

    res.json({
      success: true,
      job,
      workerOffenceHistory:   workerOffences,
      employerOffenceHistory: employerOffences,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// RESOLVE DISPUTE  [Admin]
// PATCH /disputes/:jobId/resolve
//
// Body: { resolution, adminNote, closeAs, workerPayPercent }
// resolution: 'favour_worker' | 'favour_employer' | 'neutral'
// closeAs:    'COMPLETED' | 'CANCELLED'
// workerPayPercent: 0-100 (for partial payment on neutral)
// ─────────────────────────────────────────────────────────────────────────────
exports.resolveDispute = async (req, res) => {
  try {
    const { resolution, adminNote, closeAs = 'COMPLETED', workerPayPercent } = req.body;

    if (!['favour_worker', 'favour_employer', 'neutral'].includes(resolution))
      return res.status(400).json({ success: false, message: 'Invalid resolution' });

    const job = await Job.findById(req.params.jobId)
      .populate('worker',   'name email')
      .populate('employer', 'name email');

    if (!job)              return res.status(404).json({ success: false, message: 'Job not found' });
    if (!job.disputeFlag)  return res.status(400).json({ success: false, message: 'No dispute on this job' });
    if (job.disputeStatus === DISPUTE_STATUS.RESOLVED)
      return res.status(400).json({ success: false, message: 'Already resolved' });

    const now = new Date();

    // ── Score adjustments ──────────────────────────────────────────────────
    const adjustments = {
      favour_worker:   { worker: +8, employer: -12 },
      favour_employer: { worker: -12, employer: +8 },
      neutral:         { worker: -3,  employer: -3  },
    }[resolution];

    // ── Apply as penalty (respects progressive system) ────────────────────
    await Promise.all([
      applyPenalty(job.worker._id,   'worker',   'DISPUTE_ABUSE', job._id, job.title),
      applyPenalty(job.employer._id, 'employer', 'DISPUTE_ABUSE', job._id, job.title),
    ]);

    // ── Release payment hold based on resolution ───────────────────────────
    if (resolution === 'favour_worker') {
      // Worker gets full payment
      job.paymentStatus = PAYMENT_STATUS.RELEASED;
      for (const log of job.workLog) { if (log.paymentOnHold) { log.paymentOnHold = false; log.paymentReleased = true; } }
      if (job.paymentVerification) { job.paymentVerification.paymentOnHold = false; job.paymentVerification.paymentReleased = true; }
    } else if (resolution === 'favour_employer') {
      // Payment cancelled / returned
      job.paymentStatus = PAYMENT_STATUS.NONE;
    } else if (resolution === 'neutral' && workerPayPercent !== undefined) {
      // Partial payment — admin specifies %
      job.paymentStatus = PAYMENT_STATUS.PARTIALLY_PAID;
      job.adminNote    += `\n[DISPUTE] Partial payment: ${workerPayPercent}% to worker`;
    }

    // ── Close the job ──────────────────────────────────────────────────────
    const finalStatus = closeAs === 'CANCELLED' ? JOB_STATUS.CANCELLED : JOB_STATUS.COMPLETED;
    job.status            = finalStatus;
    job.disputeStatus     = DISPUTE_STATUS.RESOLVED;
    job.disputeResolvedAt = now;
    job.disputeResolvedBy = req.user._id;
    job.disputeResolution = resolution;
    job.adminNote        += `\n[RESOLVED] ${resolution} by admin ${req.user._id} | ${adminNote || ''} at ${now.toISOString()}`;
    clearPendingAction(job);
    addTimeline(job, 'dispute_resolved', 'admin', req.user.name, `${resolution} — ${adminNote || ''}`);

    if (finalStatus === JOB_STATUS.COMPLETED) {
      await Promise.all([
        Employer.findByIdAndUpdate(job.employer._id, { $inc: { completedJobs:1, activeJobs:-1 } }),
        Worker.findByIdAndUpdate(job.worker._id,     { $inc: { completedJobs:1 } }),
      ]);
    } else {
      await Employer.findByIdAndUpdate(job.employer._id, { $inc: { activeJobs:-1 } });
    }

    await job.save();

    // ── Lift restrictions ──────────────────────────────────────────────────
    await liftDisputeRestrictions(job.worker._id, job.employer._id);

    // ── Notify both ────────────────────────────────────────────────────────
    const msgs = {
      favour_worker: {
        worker:   `✅ The dispute for <strong>${job.title}</strong> was resolved in your favour. Full payment has been released.`,
        employer: `❌ The dispute for <strong>${job.title}</strong> was resolved in the worker's favour. Your account restrictions have been lifted.`,
      },
      favour_employer: {
        worker:   `❌ The dispute for <strong>${job.title}</strong> was resolved in the employer's favour. Your account restrictions have been lifted.`,
        employer: `✅ The dispute for <strong>${job.title}</strong> was resolved in your favour. Your account restrictions have been lifted.`,
      },
      neutral: {
        worker:   `The dispute for <strong>${job.title}</strong> was resolved as a neutral outcome. ${workerPayPercent ? `You will receive ${workerPayPercent}% of the agreed payment.` : ''}`,
        employer: `The dispute for <strong>${job.title}</strong> was resolved as a neutral outcome. Your account restrictions have been lifted.`,
      },
    }[resolution];

    await Promise.all([
      notify(job.worker._id,   Worker,   '⚖️ Dispute Resolved | MoKama', msgs.worker),
      notify(job.employer._id, Employer, '⚖️ Dispute Resolved | MoKama', msgs.employer),
    ]);

    logAdminAction(req.user, 'DISPUTE_RESOLVED', { jobId: job._id, resolution, closeAs });

    res.json({
      success: true,
      message: `Dispute resolved: ${resolution}. Restrictions lifted. Job ${finalStatus}.`,
      job,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN OVERRIDE — Lift restrictions manually
// PATCH /disputes/:userId/lift-restrictions
// ─────────────────────────────────────────────────────────────────────────────
exports.adminLiftRestrictions = async (req, res) => {
  try {
    const { role, reason } = req.body;
    if (!['worker', 'employer'].includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role' });

    const Model = role === 'worker' ? Worker : Employer;
    await Model.findByIdAndUpdate(req.params.userId, {
      $set: {
        'restrictions.canAcceptNewJobs':   true,
        'restrictions.canReceivePayments': true,
        'restrictions.canCreateNewJobs':   true,
        'restrictions.canReleasePayments': true,
        'restrictions.restrictionReason':  null,
      }
    });

    logAdminAction(req.user, 'RESTRICTIONS_LIFTED', { userId: req.params.userId, role, reason });
    res.json({ success: true, message: `Restrictions lifted for ${role} ${req.params.userId}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
