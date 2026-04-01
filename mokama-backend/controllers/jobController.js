const Job        = require('../models/Job');
const JobRequest = require('../models/JobRequest');
const Worker     = require('../models/Worker');
const Employer   = require('../models/Employer');
const { JOB_STATUS }        = require('../models/Job');
const { updateHonourScore }  = require('../utils/honour');
const { NOTIFICATIONS }      = require('../services/notificationService');
const { sendEmail }          = require('../utils/emailOtp');
const { emitToUser }         = require('../socket/socketHandler');

const getIo = (req) => req.app.get('io');

// ─────────────── Job Matching ───────────────
async function triggerJobMatching(job) {
  if (!job.workerType && !job.workerTypeName) return;
  const matchQuery = {
    availabilityStatus: true, status: 'approved',
    isActive: true, isDeleted: { $ne: true },
    email: { $exists: true, $ne: '' },
  };
  if (job.workerType)          matchQuery.workerType     = job.workerType;
  else if (job.workerTypeName) matchQuery.workerTypeName = job.workerTypeName;

  let workers = await Worker.find({ ...matchQuery, pincode: job.pincode })
    .sort({ honourScore: -1 }).limit(5);
  if (workers.length < 3) {
    const dp = job.pincode?.slice(0, 3);
    const extra = await Worker.find({
      ...matchQuery, pincode: { $regex: `^${dp}`, $ne: job.pincode },
      _id: { $nin: workers.map(w => w._id) },
    }).sort({ honourScore: -1 }).limit(5 - workers.length);
    workers = [...workers, ...extra];
  }
  if (!workers.length) return;
  const employer = await Employer.findById(job.employer).select('name');
  for (const w of workers) {
    sendEmail(w.email, `New Job Available Near You — ${job.workerTypeName} | MoKama`,
      `<div style="font-family:Arial;max-width:480px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;padding:32px;border-radius:16px;">
        <h2 style="color:#f97316;">MoKama</h2>
        <p>Hi ${w.name}, a <strong style="color:#f97316;">${job.workerTypeName}</strong> job is available near you!</p>
        <p><strong>₹${job.wage}/day</strong> · ${job.address}, ${job.pincode}</p>
        <a href="${process.env.FRONTEND_URL}/worker/dashboard"
           style="display:block;background:#f97316;color:white;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:16px;">
          View Jobs
        </a>
      </div>`
    );
  }
  console.log(`📬 Job match: notified ${workers.length} workers for "${job.title}"`);
}

// ─────────────── Create Job ───────────────
exports.createJob = async (req, res) => {
  try {
    const { title, workerType, workerTypeName, address, pincode, wage, startDate, description } = req.body;
    const mongoose = require('mongoose');
    const { WorkerType } = require('../models/Category');
    let workerTypeId = undefined;
    let resolvedName = workerTypeName || workerType || '';
    if (workerType) {
      if (mongoose.Types.ObjectId.isValid(workerType)) { workerTypeId = workerType; }
      else {
        const wt = await WorkerType.findOne({ name: workerType });
        if (wt) { workerTypeId = wt._id; resolvedName = wt.name; }
        else { resolvedName = workerType; }
      }
    }
    const job = await Job.create({
      title, workerType: workerTypeId, workerTypeName: resolvedName,
      address, pincode, wage, startDate, description,
      employer: req.user._id, status: JOB_STATUS.OPEN
    });
    await Employer.findByIdAndUpdate(req.user._id, { $inc: { activeJobs: 1 } });
    triggerJobMatching(job).catch(e => console.error('Job matching error:', e.message));
    res.status(201).json({ success: true, job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────── Send Job Request ───────────────
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
      existing.status === 'ACCEPTED' ? 'Worker already accepted this job.' : 'Request already pending.' });

    const workerBusy = await Job.findOne({ worker: workerId, status: { $in: [JOB_STATUS.WORKING, JOB_STATUS.ACCEPTED] } });
    if (workerBusy) return res.status(400).json({ success: false, message: 'Worker is currently busy.' });

    const expiryMins = parseInt(process.env.JOB_REQUEST_EXPIRY_MINUTES) || 10;
    const expiresAt  = new Date(Date.now() + expiryMins * 60 * 1000);

    const jobRequest = await JobRequest.create({ job: jobId, worker: workerId, employer: req.user._id, expiresAt });
    job.status = JOB_STATUS.REQUEST_SENT; job.worker = workerId; await job.save();

    // In-app notification (DB)
    await NOTIFICATIONS.jobRequestSent(workerId, jobId, job.title);

    // Real-time socket (instant)
    emitToUser(getIo(req), workerId, 'requestReceived', {
      jobId, jobTitle: job.title, employerName: req.user.name,
      wage: job.wage, address: job.address, requestId: jobRequest._id, expiresAt,
    });

    // Email (offline fallback)
    const employer = await Employer.findById(req.user._id).select('name');
    sendEmail(worker.email, `New Job Request — ${job.title} | MoKama`,
      `<div style="font-family:Arial;max-width:480px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;padding:32px;border-radius:16px;">
        <h2 style="color:#f97316;">New Job Request</h2>
        <p>Hi ${worker.name}, you have a new job request from <strong>${employer?.name}</strong>!</p>
        <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin:16px 0;">
          <p><strong>Job:</strong> ${job.title}</p>
          <p style="color:#f97316;"><strong>Wage:</strong> ₹${job.wage}/day</p>
          <p><strong>Location:</strong> ${job.address}</p>
        </div>
        <p style="color:#f97316;font-weight:bold;">⏱ Respond within ${expiryMins} minutes to avoid a penalty</p>
        <a href="${process.env.FRONTEND_URL}/worker/dashboard/requests"
           style="display:block;background:#f97316;color:white;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:bold;">
          View & Respond Now
        </a>
      </div>`
    );

    res.json({ success: true, message: 'Job request sent', jobRequest, expiresAt });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────── Worker: Accept Job ───────────────
exports.acceptJob = async (req, res) => {
  try {
    const jobRequest = await JobRequest.findById(req.params.requestId).populate('job');
    if (!jobRequest) return res.status(404).json({ success: false, message: 'Request not found' });
    if (jobRequest.worker.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your request' });
    if (jobRequest.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Request already processed' });
    if (new Date() > jobRequest.expiresAt) return res.status(400).json({ success: false, message: 'Request expired' });

    jobRequest.status = 'ACCEPTED'; await jobRequest.save();
    const job = await Job.findByIdAndUpdate(jobRequest.job._id, { status: JOB_STATUS.ACCEPTED, worker: req.user._id }, { new: true });
    await updateHonourScore(req.user._id, 'worker', 'QUICK_RESPONSE');

    // In-app notification
    await NOTIFICATIONS.jobAccepted(jobRequest.employer, jobRequest.job._id, req.user.name);

    // Real-time socket
    emitToUser(getIo(req), jobRequest.employer, 'requestAccepted', {
      jobId: jobRequest.job._id, jobTitle: jobRequest.job.title, workerName: req.user.name,
    });

    res.json({ success: true, message: 'Job accepted', job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────── Worker: Reject Job ───────────────
exports.rejectJob = async (req, res) => {
  try {
    const jobRequest = await JobRequest.findById(req.params.requestId).populate('job');
    if (!jobRequest) return res.status(404).json({ success: false, message: 'Request not found' });
    if (jobRequest.worker.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your request' });
    if (jobRequest.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Request already processed' });

    jobRequest.status = 'REJECTED'; await jobRequest.save();
    await Job.findByIdAndUpdate(jobRequest.job._id, { status: JOB_STATUS.OPEN, worker: null });

    // In-app notification
    await NOTIFICATIONS.jobRejected(jobRequest.employer, jobRequest.job._id, req.user.name);

    // Real-time socket
    emitToUser(getIo(req), jobRequest.employer, 'requestRejected', {
      jobId: jobRequest.job._id, jobTitle: jobRequest.job.title, workerName: req.user.name,
    });

    res.json({ success: true, message: 'Job rejected' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────── Employer: Confirm Work Started ───────────────
exports.confirmWorkStarted = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.employer.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your job' });
    if (job.status !== JOB_STATUS.ACCEPTED)
      return res.status(400).json({ success: false, message: 'Job not in accepted state' });

    job.status = JOB_STATUS.WORKING; job.workStartedAt = new Date(); await job.save();

    // In-app notification
    await NOTIFICATIONS.workStarted(job.worker, job._id, job.title);

    // Real-time socket
    emitToUser(getIo(req), job.worker, 'workStarted', {
      jobId: job._id, jobTitle: job.title, employerName: req.user.name, startedAt: job.workStartedAt,
    });

    res.json({ success: true, message: 'Work started confirmed', job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────── Worker: Mark Work Completed ───────────────
exports.markWorkCompleted = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.worker.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your job' });
    if (job.status !== JOB_STATUS.WORKING)
      return res.status(400).json({ success: false, message: 'Job is not in working state' });

    job.status = JOB_STATUS.PAYMENT_PENDING; job.workCompletedAt = new Date(); await job.save();

    // In-app notifications (both parties)
    await NOTIFICATIONS.workCompleted(job.employer, job._id, req.user.name);
    await NOTIFICATIONS.paymentPending(req.user._id, job._id, job.title);

    // Real-time socket
    emitToUser(getIo(req), job.employer, 'workCompleted', {
      jobId: job._id, jobTitle: job.title, workerName: req.user.name, completedAt: job.workCompletedAt,
    });

    res.json({ success: true, message: 'Work marked as completed', job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────── Employer: Confirm Payment ───────────────
exports.confirmPayment = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.employer.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your job' });
    if (job.status !== JOB_STATUS.PAYMENT_PENDING)
      return res.status(400).json({ success: false, message: 'Payment not pending' });

    job.paymentConfirmedByEmployer = true;
    if (job.paymentConfirmedByWorker) {
      job.status = JOB_STATUS.COMPLETED;
      await updateHonourScore(req.user._id, 'employer', 'TIMELY_PAYMENT');
      await updateHonourScore(job.worker,   'worker',   'JOB_COMPLETED');
      await Promise.all([
        Employer.findByIdAndUpdate(req.user._id, { $inc: { completedJobs: 1, activeJobs: -1 } }),
        Worker.findByIdAndUpdate(job.worker,      { $inc: { completedJobs: 1 } }),
      ]);
    }
    await job.save();

    // In-app notification
    await NOTIFICATIONS.paymentConfirmedByEmployer(job.worker, job._id, job.title);

    // Real-time socket
    emitToUser(getIo(req), job.worker, 'paymentConfirmed', {
      jobId: job._id, jobTitle: job.title, employerName: req.user.name,
      isCompleted: job.status === JOB_STATUS.COMPLETED,
    });

    res.json({ success: true, message: 'Payment confirmed. Waiting for worker confirmation.', job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────── Worker: Confirm Payment Received ───────────────
exports.confirmPaymentReceived = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.worker.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your job' });
    if (!job.paymentConfirmedByEmployer)
      return res.status(400).json({ success: false, message: 'Employer has not confirmed payment yet' });

    job.paymentConfirmedByWorker = true; job.status = JOB_STATUS.COMPLETED; await job.save();

    await updateHonourScore(job.employer, 'employer', 'TIMELY_PAYMENT');
    await updateHonourScore(req.user._id, 'worker',   'JOB_COMPLETED');
    await Promise.all([
      Employer.findByIdAndUpdate(job.employer, { $inc: { completedJobs: 1, activeJobs: -1 } }),
      Worker.findByIdAndUpdate(req.user._id,   { $inc: { completedJobs: 1 } }),
    ]);

    // In-app notification
    await NOTIFICATIONS.paymentConfirmedByWorker(job.employer, job._id, job.title);

    // Real-time socket
    emitToUser(getIo(req), job.employer, 'paymentReceived', {
      jobId: job._id, jobTitle: job.title, workerName: req.user.name, isCompleted: true,
    });

    res.json({ success: true, message: 'Payment confirmed. Job completed!', job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────── Get Jobs ───────────────
exports.getWorkerJobs = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { worker: req.user._id, isHidden: { $ne: true } };
    if (status) {
      // Handle comma-separated: ?status=ACCEPTED,WORKING,PAYMENT_PENDING
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      query.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }
    const jobs = await Job.find(query)
      .populate('employer', 'name mobile employerCategoryName honourScore').sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getWorkerRequests = async (req, res) => {
  try {
    const requests = await JobRequest.find({ worker: req.user._id, status: 'PENDING', expiresAt: { $gt: new Date() } })
      .populate({ path: 'job', populate: { path: 'employer', select: 'name mobile employerCategoryName honourScore' } })
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getEmployerJobs = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { employer: req.user._id, isHidden: { $ne: true } };
    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      query.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }
    const jobs = await Job.find(query)
      .populate('worker', 'name mobile workerTypeName honourScore').sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.searchWorkers = async (req, res) => {
  try {
    const { workerType, pincode, page = 1, limit = 10 } = req.query;
    const query = { availabilityStatus: true, status: 'approved', isActive: true, isDeleted: { $ne: true } };
    if (workerType) query.workerTypeName = { $regex: workerType, $options: 'i' };
    if (pincode)    query.pincode        = pincode;
    const workers = await Worker.find(query)
      .select('name workerTypeName experience honourScore pincode address availabilityStatus')
      .sort({ honourScore: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Worker.countDocuments(query);
    res.json({ success: true, workers, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
