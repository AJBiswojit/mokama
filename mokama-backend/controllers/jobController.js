const Job        = require('../models/Job');
const JobRequest = require('../models/JobRequest');
const Worker     = require('../models/Worker');
const Employer   = require('../models/Employer');
const { JOB_STATUS }        = require('../models/Job');
const { updateHonourScore } = require('../utils/honour');
const { NOTIFICATIONS }     = require('../services/notificationService');
const { sendEmail }         = require('../utils/emailOtp');
const { emitToUser }        = require('../socket/socketHandler');

const getIo = (req) => req.app.get('io');

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Find today's workLog entry
function getTodayLog(job) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return job.workLog.find(log => {
    const d = new Date(log.date);
    return d >= today && d < tomorrow;
  });
}

// Generate workLog entries for every working day
function generateWorkLog(startDate, numberOfDays, workingDays, wage) {
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const activeDays = new Set(workingDays.map(d => dayMap[d]).filter(n => n !== undefined));

  const logs = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  let added = 0;

  // Safety: max 60 iterations to avoid infinite loop
  let iterations = 0;
  while (added < numberOfDays && iterations < 120) {
    iterations++;
    if (activeDays.size === 0 || activeDays.has(cursor.getDay())) {
      logs.push({ date: new Date(cursor), payAmount: wage, dayStatus: 'pending' });
      added++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return logs;
}

// Notify both parties — socket + DB notification
async function notifyBoth(io, { workerId, employerId, workerEvent, employerEvent, workerData, employerData, workerNotif, employerNotif }) {
  const ops = [];
  if (workerNotif)   ops.push(NOTIFICATIONS[workerNotif.fn](...workerNotif.args));
  if (employerNotif) ops.push(NOTIFICATIONS[employerNotif.fn](...employerNotif.args));
  await Promise.all(ops);
  if (workerEvent)   emitToUser(io, workerId,   workerEvent,   workerData   || {});
  if (employerEvent) emitToUser(io, employerId, employerEvent, employerData || {});
}

// ─── Job Matching ─────────────────────────────────────────────────────────────
async function triggerJobMatching(job) {
  if (!job.workerType && !job.workerTypeName) return;

  const employer = await Employer.findById(job.employer).select('name email');
  const matchQuery = {
    availabilityStatus: true, status: 'approved',
    isActive: true, isDeleted: { $ne: true },
    email: { $exists: true, $ne: '' },
    ...(employer?.email ? { email: { $nin: [employer.email] } } : {}),
  };
  if (job.workerType)          matchQuery.workerType     = job.workerType;
  else if (job.workerTypeName) matchQuery.workerTypeName = job.workerTypeName;

  // Geo-based matching: prioritise same block → district → district prefix
  let workers = await Worker.find({ ...matchQuery, block: job.block }).sort({ honourScore: -1 }).limit(5);
  if (workers.length < 3) {
    const extra = await Worker.find({
      ...matchQuery, district: job.district,
      _id: { $nin: workers.map(w => w._id) },
    }).sort({ honourScore: -1 }).limit(5 - workers.length);
    workers = [...workers, ...extra];
  }
  if (workers.length < 3) {
    const dp = job.pincode?.slice(0, 3);
    const extra2 = await Worker.find({
      ...matchQuery, pincode: { $regex: `^${dp}`, $ne: job.pincode },
      _id: { $nin: workers.map(w => w._id) },
    }).sort({ honourScore: -1 }).limit(5 - workers.length);
    workers = [...workers, ...extra2];
  }
  if (!workers.length) return;

  const wageLabel = job.jobType === 'per_hour' ? `₹${job.wage}/hr` : `₹${job.wage}/day`;

  for (const w of workers) {
    sendEmail(w.email, `New Job Near You — ${job.workerTypeName} | MoKama`,
      `<div style="font-family:Arial;max-width:480px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;padding:32px;border-radius:16px;">
        <h2 style="color:#ff2400;">MoKama</h2>
        <p>Hi ${w.name}, a <strong style="color:#ff2400;">${job.workerTypeName}</strong> job is available near you!</p>
        <p><strong>${wageLabel}</strong> · ${job.address}, ${job.district}</p>
        <a href="${process.env.FRONTEND_URL}/worker/dashboard"
           style="display:block;background:#ff2400;color:white;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:16px;">
          View Jobs
        </a>
      </div>`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE JOB
// ─────────────────────────────────────────────────────────────────────────────
exports.createJob = async (req, res) => {
  try {
    const {
      title, workerType, workerTypeName, description, workersNeeded,
      jobType,
      address, landmark, state, district, block, pincode,
      startDate, numberOfDays, reportTime, workShift,
      customShiftStart, customShiftEnd, workingDays, breakIncluded,
      arrivalTime, estimatedHours, multiDay, flexibility,
      wage, paymentMode,
      experienceRequired, genderPreference, urgency,
    } = req.body;

    const mongoose = require('mongoose');
    const { WorkerType } = require('../models/Category');

    // Resolve workerType ObjectId
    let workerTypeId   = undefined;
    let resolvedName   = workerTypeName || workerType || '';
    if (workerType) {
      if (mongoose.Types.ObjectId.isValid(workerType)) {
        workerTypeId = workerType;
      } else {
        const wt = await WorkerType.findOne({ name: workerType });
        if (wt) { workerTypeId = wt._id; resolvedName = wt.name; }
        else    { resolvedName = workerType; }
      }
    }

    // Calculate endDate for per_day jobs
    let endDate = null;
    if (jobType === 'per_day' && startDate && numberOfDays) {
      const days  = parseInt(numberOfDays) || 1;
      const wDays = Array.isArray(workingDays) ? workingDays : ['Mon','Tue','Wed','Thu','Fri','Sat'];
      const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const activeDays = new Set(wDays.map(d => dayMap[d]).filter(n => n !== undefined));
      const cursor = new Date(startDate);
      cursor.setHours(0, 0, 0, 0);
      let counted = 0; let iters = 0;
      while (counted < days && iters < 120) {
        iters++;
        if (activeDays.size === 0 || activeDays.has(cursor.getDay())) counted++;
        if (counted < days) cursor.setDate(cursor.getDate() + 1);
      }
      endDate = new Date(cursor);
    }

    const job = await Job.create({
      title, description,
      workerType: workerTypeId, workerTypeName: resolvedName,
      workersNeeded: workersNeeded || 1,
      jobType: jobType || 'per_day',
      address, landmark: landmark || '', state, district, block, pincode,
      startDate, numberOfDays: numberOfDays || 1, endDate,
      reportTime: reportTime || '08:00',
      workShift: workShift || 'full_day',
      customShiftStart: customShiftStart || '',
      customShiftEnd:   customShiftEnd   || '',
      workingDays: Array.isArray(workingDays) ? workingDays : ['Mon','Tue','Wed','Thu','Fri','Sat'],
      breakIncluded: breakIncluded !== false,
      arrivalTime:    arrivalTime    || '',
      estimatedHours: estimatedHours || 0,
      multiDay:       multiDay       || false,
      flexibility:    flexibility    || 'exact',
      wage, paymentMode: paymentMode || 'cash',
      experienceRequired: experienceRequired || 'none',
      genderPreference:   genderPreference   || 'any',
      urgency:            urgency            || 'normal',
      employer: req.user._id,
      status:   JOB_STATUS.OPEN,
    });

    await Employer.findByIdAndUpdate(req.user._id, { $inc: { activeJobs: 1 } });
    triggerJobMatching(job).catch(e => console.error('Matching error:', e.message));

    res.status(201).json({ success: true, job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// SEND JOB REQUEST  [Employer → Worker]
// ─────────────────────────────────────────────────────────────────────────────
exports.sendJobRequest = async (req, res) => {
  try {
    const { jobId, workerId } = req.body;
    const [job, worker] = await Promise.all([Job.findById(jobId), Worker.findById(workerId)]);
    if (!job)    return res.status(404).json({ success: false, message: 'Job not found' });
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    if (job.employer.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your job' });
    if (job.status !== JOB_STATUS.OPEN)
      return res.status(400).json({ success: false, message: 'Job is not open' });

    const existing = await JobRequest.findOne({ job: jobId, worker: workerId, status: { $in: ['PENDING','ACCEPTED'] } });
    if (existing) return res.status(400).json({ success: false, message:
      existing.status === 'ACCEPTED' ? 'Worker already accepted.' : 'Request already pending.' });

    const workerBusy = await Job.findOne({
      worker: workerId,
      status: { $in: [JOB_STATUS.ACCEPTED, JOB_STATUS.BOOKING_CONFIRMED, JOB_STATUS.ARRIVED, JOB_STATUS.WORK_IN_PROGRESS] }
    });
    if (workerBusy) return res.status(400).json({ success: false, message: 'Worker is currently busy.' });

    const expiryMins = parseInt(process.env.JOB_REQUEST_EXPIRY_MINUTES) || 10;
    const expiresAt  = new Date(Date.now() + expiryMins * 60 * 1000);

    const jobRequest = await JobRequest.create({ job: jobId, worker: workerId, employer: req.user._id, expiresAt });
    job.status = JOB_STATUS.REQUEST_SENT; job.worker = workerId; await job.save();

    await NOTIFICATIONS.jobRequestSent(workerId, jobId, job.title);
    emitToUser(getIo(req), workerId, 'requestReceived', {
      jobId, jobTitle: job.title, employerName: req.user.name,
      wage: job.wage, jobType: job.jobType,
      address: job.address, district: job.district,
      requestId: jobRequest._id, expiresAt,
    });

    const employer = await Employer.findById(req.user._id).select('name');
    const wageLabel = job.jobType === 'per_hour' ? `₹${job.wage}/hr` : `₹${job.wage}/day`;
    sendEmail(worker.email, `New Job Request — ${job.title} | MoKama`,
      `<div style="font-family:Arial;max-width:480px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;padding:32px;border-radius:16px;">
        <h2 style="color:#ff2400;">New Job Request</h2>
        <p>Hi ${worker.name}, you have a new request from <strong>${employer?.name}</strong>!</p>
        <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin:16px 0;">
          <p><strong>Job:</strong> ${job.title}</p>
          <p style="color:#ff2400;"><strong>Pay:</strong> ${wageLabel}</p>
          <p><strong>Location:</strong> ${job.address}, ${job.district}</p>
          <p><strong>Start Date:</strong> ${new Date(job.startDate).toLocaleDateString('en-IN')}</p>
        </div>
        <p style="color:#ff2400;font-weight:bold;">⏱ Respond within ${expiryMins} minutes</p>
        <a href="${process.env.FRONTEND_URL}/worker/dashboard/requests"
           style="display:block;background:#ff2400;color:white;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:bold;">
          View & Respond Now
        </a>
      </div>`
    );

    res.json({ success: true, message: 'Job request sent', jobRequest, expiresAt });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Accept Job Request
// ─────────────────────────────────────────────────────────────────────────────
exports.acceptJob = async (req, res) => {
  try {
    const jobRequest = await JobRequest.findById(req.params.requestId).populate('job');
    if (!jobRequest) return res.status(404).json({ success: false, message: 'Request not found' });
    if (jobRequest.worker.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your request' });
    if (jobRequest.status !== 'PENDING')
      return res.status(400).json({ success: false, message: 'Request already processed' });
    if (new Date() > jobRequest.expiresAt)
      return res.status(400).json({ success: false, message: 'Request expired' });

    jobRequest.status = 'ACCEPTED'; await jobRequest.save();
    const job = await Job.findByIdAndUpdate(
      jobRequest.job._id,
      { status: JOB_STATUS.ACCEPTED, worker: req.user._id },
      { new: true }
    );
    await updateHonourScore(req.user._id, 'worker', 'QUICK_RESPONSE');
    await NOTIFICATIONS.jobAccepted(jobRequest.employer, jobRequest.job._id, req.user.name);
    emitToUser(getIo(req), jobRequest.employer, 'requestAccepted', {
      jobId: jobRequest.job._id, jobTitle: jobRequest.job.title, workerName: req.user.name,
    });

    res.json({ success: true, message: 'Job accepted', job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Reject Job Request
// ─────────────────────────────────────────────────────────────────────────────
exports.rejectJob = async (req, res) => {
  try {
    const jobRequest = await JobRequest.findById(req.params.requestId).populate('job');
    if (!jobRequest) return res.status(404).json({ success: false, message: 'Request not found' });
    if (jobRequest.worker.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your request' });
    if (jobRequest.status !== 'PENDING')
      return res.status(400).json({ success: false, message: 'Already processed' });

    jobRequest.status = 'REJECTED'; await jobRequest.save();
    const job = await Job.findByIdAndUpdate(
      jobRequest.job._id,
      { status: JOB_STATUS.OPEN, worker: null },
      { new: true }
    );
    await NOTIFICATIONS.jobRejected(jobRequest.employer, jobRequest.job._id, req.user.name);
    emitToUser(getIo(req), jobRequest.employer, 'requestRejected', {
      jobId: jobRequest.job._id, jobTitle: jobRequest.job.title, workerName: req.user.name,
    });

    res.json({ success: true, message: 'Job rejected', job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYER: Confirm Booking  [ACCEPTED → BOOKING_CONFIRMED]
// Generates workLog for per_day jobs
// ─────────────────────────────────────────────────────────────────────────────
exports.confirmBooking = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.employer.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your job' });
    if (job.status !== JOB_STATUS.ACCEPTED)
      return res.status(400).json({ success: false, message: 'Job must be in ACCEPTED state' });

    job.status             = JOB_STATUS.BOOKING_CONFIRMED;
    job.bookingConfirmedAt = new Date();

    // Generate daily work log for per_day jobs
    if (job.jobType === 'per_day') {
      job.workLog = generateWorkLog(
        job.startDate,
        job.numberOfDays,
        job.workingDays,
        job.wage
      );
    }

    await job.save();

    emitToUser(getIo(req), job.worker, 'bookingConfirmed', {
      jobId: job._id, jobTitle: job.title,
      employerName: req.user.name,
      startDate: job.startDate,
      jobType: job.jobType,
      ...(job.jobType === 'per_day' ? {
        numberOfDays: job.numberOfDays,
        endDate:      job.endDate,
        reportTime:   job.reportTime,
        workShift:    job.workShift,
        workingDays:  job.workingDays,
      } : {
        arrivalTime:    job.arrivalTime,
        estimatedHours: job.estimatedHours,
      }),
    });

    res.json({ success: true, message: 'Booking confirmed', job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Mark Arrived  [per_day + per_hour]
// ─────────────────────────────────────────────────────────────────────────────
exports.markArrived = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (!job.worker || job.worker.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your job' });
    if (job.status !== JOB_STATUS.BOOKING_CONFIRMED && job.status !== JOB_STATUS.WORK_IN_PROGRESS)
      return res.status(400).json({ success: false, message: 'Job not ready for arrival marking' });

    const now = new Date();

    if (job.jobType === 'per_day') {
      const todayLog = getTodayLog(job);
      if (!todayLog) return res.status(400).json({ success: false, message: 'No work scheduled for today' });
      if (todayLog.arrivedAt) return res.status(400).json({ success: false, message: 'Already marked arrived today' });

      todayLog.arrivedAt = now;
      todayLog.dayStatus = 'in_progress';

      // Set auto-confirm timer message (actual auto-confirm handled by cron or re-check)
      job.status    = JOB_STATUS.ARRIVED;
      job.arrivedAt = job.arrivedAt || now; // first arrival only
    } else {
      // per_hour
      job.timeLog.onTheWayAt = job.timeLog.onTheWayAt || now;
      job.status             = JOB_STATUS.ARRIVED;
      job.arrivedAt          = now;
    }

    await job.save();

    // Notify employer — they have 30 min to confirm (or it auto-confirms)
    emitToUser(getIo(req), job.employer, 'workerArrived', {
      jobId: job._id, jobTitle: job.title,
      workerName: req.user.name, arrivedAt: now,
      message: 'Worker has arrived. Please confirm or it will auto-confirm in 30 minutes.',
    });

    res.json({ success: true, message: 'Arrival marked successfully', job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYER: Confirm Arrival  [per_day]
// ─────────────────────────────────────────────────────────────────────────────
exports.confirmArrival = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.employer.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your job' });
    if (job.status !== JOB_STATUS.ARRIVED)
      return res.status(400).json({ success: false, message: 'Worker has not marked arrival yet' });

    const todayLog = getTodayLog(job);
    if (!todayLog) return res.status(400).json({ success: false, message: 'No log entry for today' });

    const now = new Date();
    todayLog.arrivalConfirmed   = true;
    todayLog.arrivalConfirmedAt = now;
    todayLog.dayStatus          = 'in_progress';
    job.status = JOB_STATUS.WORK_IN_PROGRESS;
    job.workStartedAt = job.workStartedAt || now;
    await job.save();

    emitToUser(getIo(req), job.worker, 'arrivalConfirmed', {
      jobId: job._id, jobTitle: job.title, confirmedAt: now,
    });

    res.json({ success: true, message: 'Arrival confirmed. Work in progress.', job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYER: Mark Day Complete + Release Daily Pay  [per_day]
// ─────────────────────────────────────────────────────────────────────────────
exports.logDayComplete = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.employer.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your job' });
    if (job.status !== JOB_STATUS.WORK_IN_PROGRESS)
      return res.status(400).json({ success: false, message: 'Job is not in progress' });
    if (job.jobType !== 'per_day')
      return res.status(400).json({ success: false, message: 'Day logging is only for per-day jobs' });

    const todayLog = getTodayLog(job);
    if (!todayLog) return res.status(400).json({ success: false, message: 'No log for today' });
    if (todayLog.dayCompleted) return res.status(400).json({ success: false, message: 'Today already logged' });
    if (!todayLog.arrivalConfirmed)
      return res.status(400).json({ success: false, message: 'Arrival not confirmed yet' });

    const now      = new Date();
    const payAmount = req.body.payAmount || todayLog.payAmount || job.wage;

    todayLog.dayCompleted      = true;
    todayLog.dayCompletedAt    = now;
    todayLog.payAmount         = payAmount;
    todayLog.paymentReleased   = true;
    todayLog.paymentReleasedAt = now;
    todayLog.dayStatus         = 'completed';

    // Check if this is the final day
    const allDaysCount   = job.workLog.length;
    const completedCount = job.workLog.filter(l => l.dayCompleted).length;
    const isFinalDay     = completedCount >= allDaysCount;

    if (isFinalDay) {
      job.status           = JOB_STATUS.WORK_DONE;
      job.workCompletedAt  = now;
    }
    // Keep status as WORK_IN_PROGRESS for non-final days (next morning worker marks arrived again)

    await job.save();

    emitToUser(getIo(req), job.worker, 'dailyPayReleased', {
      jobId: job._id, jobTitle: job.title,
      payAmount, isFinalDay,
      message: isFinalDay
        ? `Day ${completedCount} (final day) complete. ₹${payAmount} released.`
        : `Day ${completedCount} of ${allDaysCount} complete. ₹${payAmount} released.`,
    });

    res.json({
      success: true,
      message: isFinalDay
        ? `Final day logged. ₹${payAmount} released. Waiting for worker confirmation.`
        : `Day ${completedCount} of ${allDaysCount} logged. ₹${payAmount} released.`,
      job, isFinalDay,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Confirm Daily Payment Received  [per_day]
// ─────────────────────────────────────────────────────────────────────────────
exports.confirmDailyPayReceived = async (req, res) => {
  try {
    const { dayLogId } = req.params;
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (!job.worker || job.worker.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your job' });
    if (job.jobType !== 'per_day')
      return res.status(400).json({ success: false, message: 'Only for per-day jobs' });

    const logEntry = job.workLog.id(dayLogId);
    if (!logEntry)
      return res.status(404).json({ success: false, message: 'Day log entry not found' });
    if (!logEntry.paymentReleased)
      return res.status(400).json({ success: false, message: 'Payment not released yet by employer' });
    if (logEntry.paymentConfirmed)
      return res.status(400).json({ success: false, message: 'Already confirmed' });

    const now = new Date();
    logEntry.paymentConfirmed   = true;
    logEntry.paymentConfirmedAt = now;
    logEntry.dayStatus          = 'paid';

    // Update totals
    job.totalAmountPaid += logEntry.payAmount;
    job.totalDaysLogged += 1;

    // Check if all days are paid — close the job
    const allPaid = job.workLog.every(l => l.paymentConfirmed || l.dayStatus === 'absent');
    if (allPaid) {
      job.status                      = JOB_STATUS.COMPLETED;
      job.paymentConfirmedByWorker    = true;
      job.paymentConfirmedByEmployer  = true;
      await updateHonourScore(job.employer, 'employer', 'TIMELY_PAYMENT');
      await updateHonourScore(req.user._id, 'worker',   'JOB_COMPLETED');
      await Promise.all([
        Employer.findByIdAndUpdate(job.employer, { $inc: { completedJobs: 1, activeJobs: -1 } }),
        Worker.findByIdAndUpdate(req.user._id,   { $inc: { completedJobs: 1 } }),
      ]);
    }

    await job.save();

    emitToUser(getIo(req), job.employer, 'dailyPayConfirmed', {
      jobId: job._id, jobTitle: job.title,
      dayLogId, workerName: req.user.name,
      totalPaid: job.totalAmountPaid,
      isCompleted: allPaid,
    });

    res.json({
      success: true,
      message: allPaid
        ? 'All days paid. Job completed!'
        : `Day payment confirmed. Total paid: ₹${job.totalAmountPaid}`,
      job, isCompleted: allPaid,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PER HOUR — Worker: Mark On The Way
// ─────────────────────────────────────────────────────────────────────────────
exports.markOnTheWay = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (!job.worker || job.worker.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your job' });
    if (job.jobType !== 'per_hour')
      return res.status(400).json({ success: false, message: 'Only for per-hour jobs' });
    if (job.status !== JOB_STATUS.BOOKING_CONFIRMED)
      return res.status(400).json({ success: false, message: 'Booking not confirmed yet' });

    job.timeLog.onTheWayAt = new Date();
    await job.save();

    emitToUser(getIo(req), job.employer, 'workerOnTheWay', {
      jobId: job._id, jobTitle: job.title,
      workerName: req.user.name, onTheWayAt: job.timeLog.onTheWayAt,
    });

    res.json({ success: true, message: 'Employer notified you are on the way', job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PER HOUR — Worker: Start Work (clock in)
// ─────────────────────────────────────────────────────────────────────────────
exports.startHourlyWork = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (!job.worker || job.worker.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your job' });
    if (job.jobType !== 'per_hour')
      return res.status(400).json({ success: false, message: 'Only for per-hour jobs' });
    if (![JOB_STATUS.BOOKING_CONFIRMED, JOB_STATUS.ARRIVED].includes(job.status))
      return res.status(400).json({ success: false, message: 'Cannot start work yet' });

    const now = new Date();
    job.status             = JOB_STATUS.WORK_IN_PROGRESS;
    job.workStartedAt      = now;
    job.arrivedAt          = job.arrivedAt || now;
    job.timeLog.startedAt  = now;
    await job.save();

    emitToUser(getIo(req), job.employer, 'hourlyWorkStarted', {
      jobId: job._id, jobTitle: job.title,
      workerName: req.user.name, startedAt: now,
    });

    res.json({ success: true, message: 'Work started. Clock running.', job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PER HOUR — Worker: Complete Work (clock out)
// ─────────────────────────────────────────────────────────────────────────────
exports.completeHourlyWork = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (!job.worker || job.worker.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your job' });
    if (job.jobType !== 'per_hour')
      return res.status(400).json({ success: false, message: 'Only for per-hour jobs' });
    if (job.status !== JOB_STATUS.WORK_IN_PROGRESS)
      return res.status(400).json({ success: false, message: 'Work not started yet' });
    if (!job.timeLog.startedAt)
      return res.status(400).json({ success: false, message: 'Clock-in not recorded' });

    const now          = new Date();
    const diffMs       = now - new Date(job.timeLog.startedAt);
    const actualHours  = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    const totalAmount  = parseFloat((actualHours * job.wage).toFixed(2));

    job.status               = JOB_STATUS.WORK_DONE;
    job.workCompletedAt      = now;
    job.timeLog.completedAt  = now;
    job.timeLog.totalAmount  = totalAmount;
    await job.save();

    emitToUser(getIo(req), job.employer, 'hourlyWorkDone', {
      jobId:       job._id,
      jobTitle:    job.title,
      workerName:  req.user.name,
      startedAt:   job.timeLog.startedAt,
      completedAt: now,
      actualHours,
      totalAmount,
      message:     `Work done. ${actualHours} hrs × ₹${job.wage}/hr = ₹${totalAmount}. Please approve.`,
    });

    res.json({ success: true, message: `Work done. ${actualHours} hrs. Total: ₹${totalAmount}`, job, actualHours, totalAmount });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PER HOUR — Employer: Approve Hours + Release Payment
// ─────────────────────────────────────────────────────────────────────────────
exports.approveAndPayHourly = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.employer.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your job' });
    if (job.jobType !== 'per_hour')
      return res.status(400).json({ success: false, message: 'Only for per-hour jobs' });
    if (job.status !== JOB_STATUS.WORK_DONE)
      return res.status(400).json({ success: false, message: 'Work not marked done yet' });

    // Employer can override hours (in case of dispute resolution)
    const approvedHours  = parseFloat(req.body.approvedHours) || parseFloat(
      ((new Date(job.timeLog.completedAt) - new Date(job.timeLog.startedAt)) / (1000 * 60 * 60)).toFixed(2)
    );
    const totalAmount    = parseFloat((approvedHours * job.wage).toFixed(2));

    job.status                        = JOB_STATUS.PAYMENT_PENDING;
    job.paymentConfirmedByEmployer    = true;
    job.timeLog.approvedHours         = approvedHours;
    job.timeLog.totalAmount           = totalAmount;
    await job.save();

    emitToUser(getIo(req), job.worker, 'hourlyPaymentReleased', {
      jobId:         job._id,
      jobTitle:      job.title,
      approvedHours,
      totalAmount,
      paymentMode:   job.paymentMode,
      message:       `₹${totalAmount} released for ${approvedHours} hrs via ${job.paymentMode}. Please confirm receipt.`,
    });

    res.json({ success: true, message: `₹${totalAmount} released. Waiting for worker confirmation.`, job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PER HOUR — Worker: Confirm Payment Received
// ─────────────────────────────────────────────────────────────────────────────
exports.confirmHourlyPayReceived = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (!job.worker || job.worker.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your job' });
    if (job.jobType !== 'per_hour')
      return res.status(400).json({ success: false, message: 'Only for per-hour jobs' });
    if (!job.paymentConfirmedByEmployer)
      return res.status(400).json({ success: false, message: 'Payment not released yet' });

    job.status                     = JOB_STATUS.COMPLETED;
    job.paymentConfirmedByWorker   = true;
    job.totalAmountPaid            = job.timeLog.totalAmount;

    await updateHonourScore(job.employer, 'employer', 'TIMELY_PAYMENT');
    await updateHonourScore(req.user._id, 'worker',   'JOB_COMPLETED');
    await Promise.all([
      Employer.findByIdAndUpdate(job.employer, { $inc: { completedJobs: 1, activeJobs: -1 } }),
      Worker.findByIdAndUpdate(req.user._id,   { $inc: { completedJobs: 1 } }),
    ]);
    await job.save();

    emitToUser(getIo(req), job.employer, 'paymentReceived', {
      jobId: job._id, jobTitle: job.title,
      workerName: req.user.name, isCompleted: true,
      totalAmount: job.timeLog.totalAmount,
    });

    res.json({ success: true, message: 'Payment confirmed. Job completed!', job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET: Worker's jobs (all or by status)
// ─────────────────────────────────────────────────────────────────────────────
exports.getWorkerJobs = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { worker: req.user._id, isHidden: { $ne: true } };
    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      query.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }
    const jobs = await Job.find(query)
      .populate('employer', 'name mobile employerCategoryName honourScore')
      .sort({ updatedAt: -1 });
    res.json({ success: true, jobs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getWorkerRequests = async (req, res) => {
  try {
    const requests = await JobRequest.find({
      worker: req.user._id, status: 'PENDING', expiresAt: { $gt: new Date() }
    }).populate({ path: 'job', populate: { path: 'employer', select: 'name mobile employerCategoryName honourScore' } })
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET: Employer's jobs
// ─────────────────────────────────────────────────────────────────────────────
exports.getEmployerJobs = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { employer: req.user._id, isHidden: { $ne: true } };
    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      query.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }
    const jobs = await Job.find(query)
      .populate('worker', 'name mobile workerTypeName honourScore')
      .sort({ updatedAt: -1 });
    res.json({ success: true, jobs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET: Search workers
// ─────────────────────────────────────────────────────────────────────────────
exports.searchWorkers = async (req, res) => {
  try {
    const { workerType, pincode, page = 1, limit = 10 } = req.query;
    const query = {
      availabilityStatus: true, status: 'approved',
      isActive: true, isDeleted: { $ne: true }
    };
    if (workerType) query.workerTypeName = { $regex: workerType, $options: 'i' };
    if (pincode)    query.pincode        = pincode;
    const [workers, total] = await Promise.all([
      Worker.find(query)
        .select('name workerTypeName experience honourScore pincode address block district availabilityStatus')
        .sort({ honourScore: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Worker.countDocuments(query),
    ]);
    res.json({ success: true, workers, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
