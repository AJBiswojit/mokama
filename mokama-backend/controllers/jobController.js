const Job = require('../models/Job');
const JobRequest = require('../models/JobRequest');
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const { JOB_STATUS } = require('../models/Job');
const { updateHonourScore } = require('../utils/honour');
const { NOTIFICATIONS } = require('../services/notificationService');
const { sendEmail } = require('../utils/emailOtp');


// ─────────────── Job Matching ───────────────
// Fires after job creation — finds top 5 matching available workers
// and sends them an email notification. Non-blocking, never affects API response.

async function triggerJobMatching(job) {
  if (!job.workerType && !job.workerTypeName) return;

  const matchQuery = {
    availabilityStatus: true,
    status:             'approved',
    isActive:           true,
    isDeleted:          { $ne: true },
    email:              { $exists: true, $ne: '' },
  };

  // Match by worker type
  if (job.workerType) {
    matchQuery.workerType = job.workerType;
  } else if (job.workerTypeName) {
    matchQuery.workerTypeName = job.workerTypeName;
  }

  // Prefer same pincode first, then same first 3 digits (same district)
  let workers = await Worker.find({
    ...matchQuery,
    pincode: job.pincode,
  }).sort({ honourScore: -1 }).limit(5);

  if (workers.length < 3) {
    const districtPin = job.pincode?.slice(0, 3);
    const extra = await Worker.find({
      ...matchQuery,
      pincode: { $regex: `^${districtPin}`, $ne: job.pincode },
      _id: { $nin: workers.map(w => w._id) },
    }).sort({ honourScore: -1 }).limit(5 - workers.length);
    workers = [...workers, ...extra];
  }

  if (workers.length === 0) return;

  const employer = await Employer.findById(job.employer).select('name');

  for (const worker of workers) {
    sendEmail(
      worker.email,
      `New Job Available Near You — ${job.workerTypeName} | MoKama`,
      `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                  background: #0a0a0a; color: #f0f0f0; padding: 32px; border-radius: 16px;">
        <h2 style="color: #f97316; margin: 0 0 4px 0;">MoKama</h2>
        <p style="color: #6b6b6b; font-size: 12px; margin: 0 0 24px 0;">Where Work Meets Trust</p>

        <p style="color: #a3a3a3;">Hi <strong style="color: #f0f0f0;">${worker.name}</strong>,</p>
        <p style="color: #a3a3a3;">A new <strong style="color: #f97316;">${job.workerTypeName}</strong> job
           has been posted near you!</p>

        <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px;
                    padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="color: #6b6b6b; font-size: 13px; padding: 5px 0;">Job Title</td>
                <td style="color: #f0f0f0; font-size: 13px; font-weight: bold;">${job.title}</td></tr>
            <tr><td style="color: #6b6b6b; font-size: 13px; padding: 5px 0;">Posted by</td>
                <td style="color: #f0f0f0; font-size: 13px;">${employer?.name || 'Employer'}</td></tr>
            <tr><td style="color: #6b6b6b; font-size: 13px; padding: 5px 0;">Daily Wage</td>
                <td style="color: #f97316; font-size: 15px; font-weight: bold;">₹${job.wage}</td></tr>
            <tr><td style="color: #6b6b6b; font-size: 13px; padding: 5px 0;">Location</td>
                <td style="color: #f0f0f0; font-size: 13px;">${job.address}, ${job.pincode}</td></tr>
            ${job.startDate ? `<tr><td style="color: #6b6b6b; font-size: 13px; padding: 5px 0;">Start Date</td>
                <td style="color: #f0f0f0; font-size: 13px;">${new Date(job.startDate).toLocaleDateString('en-IN')}</td></tr>` : ''}
          </table>
        </div>

        <p style="color: #6b6b6b; font-size: 12px;">
          Mark yourself available and login to get hired before someone else does.
        </p>

        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/worker/dashboard"
           style="display: block; background: #f97316; color: white; text-align: center;
                  padding: 14px; border-radius: 10px; text-decoration: none;
                  font-weight: bold; font-size: 15px; margin: 20px 0;">
          View Jobs on MoKama
        </a>

        <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 24px 0;" />
        <p style="color: #3a3a3a; font-size: 12px; text-align: center; margin: 0;">
          © 2025 MoKama — Kaam ko Mukam tak
        </p>
      </div>
      `
    );
  }

  console.log(`📬 Job match: notified ${workers.length} workers for job "${job.title}"`);
}

// ─────────────── Employer: Create Job ───────────────

exports.createJob = async (req, res) => {
  try {
    const { title, workerType, workerTypeName, address, pincode, wage, startDate, description } = req.body;
    const mongoose = require('mongoose');
    const { WorkerType } = require('../models/Category');

    // workerType from the frontend is a name string (e.g. "Mason"), not an ObjectId.
    // Resolve it to an ObjectId if possible; otherwise just store the name.
    let workerTypeId = undefined;
    let resolvedName = workerTypeName || workerType || '';

    if (workerType) {
      if (mongoose.Types.ObjectId.isValid(workerType)) {
        workerTypeId = workerType;
      } else {
        const wt = await WorkerType.findOne({ name: workerType });
        if (wt) { workerTypeId = wt._id; resolvedName = wt.name; }
        else { resolvedName = workerType; }
      }
    }

    const job = await Job.create({
      title,
      workerType: workerTypeId,
      workerTypeName: resolvedName,
      address, pincode, wage, startDate, description,
      employer: req.user._id,
      status: JOB_STATUS.OPEN
    });

    await Employer.findByIdAndUpdate(req.user._id, { $inc: { activeJobs: 1 } });

    // Feature 8 — Job Matching: notify top 5 matching workers automatically
    triggerJobMatching(job).catch(err =>
      console.error('Job matching error:', err.message)
    );

    res.status(201).json({ success: true, job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────── Employer: Send Job Request ───────────────

exports.sendJobRequest = async (req, res) => {
  try {
    const { jobId, workerId } = req.body;
    const job = await Job.findOne({ _id: jobId, employer: req.user._id });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.status !== JOB_STATUS.OPEN) return res.status(400).json({ success: false, message: 'Job is not open' });

    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });

    // Fix 3: Improved duplicate request prevention
    // Check any non-rejected, non-expired request for this job+worker combo
    const existing = await JobRequest.findOne({
      job: jobId,
      worker: workerId,
      status: { $in: ['PENDING', 'ACCEPTED'] }
    });
    if (existing) {
      const msg = existing.status === 'ACCEPTED'
        ? 'This worker has already accepted a request for this job.'
        : 'A request is already pending for this worker. Wait for their response.';
      return res.status(400).json({ success: false, message: msg });
    }

    // Also check if worker already has an active job (WORKING status)
    const workerBusy = await Job.findOne({
      worker: workerId,
      status: { $in: [JOB_STATUS.WORKING, JOB_STATUS.ACCEPTED] }
    });
    if (workerBusy) {
      return res.status(400).json({
        success: false,
        message: 'This worker is currently busy with another job.'
      });
    }

    const expiryMinutes = parseInt(process.env.JOB_REQUEST_EXPIRY_MINUTES) || 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const request = await JobRequest.create({
      job: jobId, worker: workerId, employer: req.user._id, expiresAt
    });

    job.status = JOB_STATUS.REQUEST_SENT;
    job.worker = workerId;
    await job.save();

    await NOTIFICATIONS.jobRequestSent(workerId, jobId, job.title);

    // Fix 5: Email notification to worker when job request arrives
    const employer = await Employer.findById(req.user._id).select('name');
    sendEmail(
      worker.email,
      `New Job Request — ${job.title} | MoKama`,
      `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                  background: #0a0a0a; color: #f0f0f0; padding: 32px; border-radius: 16px;">
        <h2 style="color: #f97316; margin: 0 0 4px 0;">MoKama</h2>
        <p style="color: #6b6b6b; font-size: 12px; margin: 0 0 24px 0;">Where Work Meets Trust</p>

        <p style="color: #a3a3a3;">Hi <strong style="color: #f0f0f0;">${worker.name}</strong>,</p>
        <p style="color: #a3a3a3;">You have received a new job request!</p>

        <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="color: #6b6b6b; font-size: 13px; padding: 4px 0;">Job</td>
                <td style="color: #f0f0f0; font-size: 13px; font-weight: bold;">${job.title}</td></tr>
            <tr><td style="color: #6b6b6b; font-size: 13px; padding: 4px 0;">Employer</td>
                <td style="color: #f0f0f0; font-size: 13px;">${employer?.name || 'Unknown'}</td></tr>
            <tr><td style="color: #6b6b6b; font-size: 13px; padding: 4px 0;">Wage</td>
                <td style="color: #f97316; font-size: 13px; font-weight: bold;">₹${job.wage}/day</td></tr>
            <tr><td style="color: #6b6b6b; font-size: 13px; padding: 4px 0;">Location</td>
                <td style="color: #f0f0f0; font-size: 13px;">${job.address}, ${job.pincode}</td></tr>
          </table>
        </div>

        <div style="background: #f97316/15; border: 1px solid #f97316; border-radius: 8px;
                    padding: 12px; margin: 16px 0; text-align: center;">
          <span style="color: #f97316; font-size: 13px; font-weight: bold;">
            ⏱ Respond within ${expiryMinutes} minutes to avoid a penalty
          </span>
        </div>

        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/worker/dashboard"
           style="display: block; background: #f97316; color: white; text-align: center;
                  padding: 14px; border-radius: 10px; text-decoration: none;
                  font-weight: bold; font-size: 15px; margin: 20px 0;">
          View & Respond Now
        </a>

        <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 24px 0;" />
        <p style="color: #3a3a3a; font-size: 12px; text-align: center; margin: 0;">
          © 2025 MoKama — Kaam ko Mukam tak
        </p>
      </div>
      `
    ); // non-awaited — fire and forget, don't block the response

    res.json({ success: true, request, expiresAt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────── Worker: Accept Job ───────────────

exports.acceptJob = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await JobRequest.findOne({ _id: requestId, worker: req.user._id });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Request already processed' });
    if (request.expiresAt < new Date()) return res.status(400).json({ success: false, message: 'Request expired' });

    request.status = 'ACCEPTED';
    await request.save();

    const job = await Job.findByIdAndUpdate(request.job, { status: JOB_STATUS.ACCEPTED }, { new: true });

    // Auto-turn OFF availability when job is accepted
    await Worker.findByIdAndUpdate(req.user._id, { availabilityStatus: false });

    // Update honour score for quick response
    await updateHonourScore(req.user._id, 'worker', 'QUICK_RESPONSE');

    const employer = await Employer.findById(request.employer);
    await NOTIFICATIONS.jobAccepted(request.employer, request.job, req.user.name);

    res.json({ success: true, message: 'Job accepted', job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────── Worker: Reject Job ───────────────

exports.rejectJob = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await JobRequest.findOne({ _id: requestId, worker: req.user._id });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    request.status = 'REJECTED';
    await request.save();

    await Job.findByIdAndUpdate(request.job, { status: JOB_STATUS.OPEN, worker: null });
    await NOTIFICATIONS.jobRejected(request.employer, request.job, req.user.name);

    res.json({ success: true, message: 'Job rejected' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────── Employer: Confirm Work Started ───────────────

exports.confirmWorkStarted = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findOne({ _id: jobId, employer: req.user._id });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.status !== JOB_STATUS.ACCEPTED) return res.status(400).json({ success: false, message: 'Job not in accepted state' });

    job.status = JOB_STATUS.WORKING;
    job.workStartedAt = new Date();
    await job.save();

    await NOTIFICATIONS.workStarted(job.worker, job._id, job.title);
    res.json({ success: true, message: 'Work started confirmed', job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────── Worker: Mark Work Completed ───────────────

exports.markWorkCompleted = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findOne({ _id: jobId, worker: req.user._id });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.status !== JOB_STATUS.WORKING) return res.status(400).json({ success: false, message: 'Job is not in working state' });

    job.status = JOB_STATUS.PAYMENT_PENDING;
    job.workCompletedAt = new Date();
    await job.save();

    const employer = await Employer.findById(job.employer);
    await NOTIFICATIONS.workCompleted(job.employer, job._id, req.user.name);
    await NOTIFICATIONS.paymentPending(req.user._id, job._id, job.title);

    res.json({ success: true, message: 'Work marked as completed', job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────── Employer: Confirm Payment ───────────────

exports.confirmPayment = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findOne({ _id: jobId, employer: req.user._id });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.status !== JOB_STATUS.PAYMENT_PENDING) return res.status(400).json({ success: false, message: 'Payment not pending' });

    job.paymentConfirmedByEmployer = true;
    await job.save();

    await updateHonourScore(req.user._id, 'employer', 'TIMELY_PAYMENT');
    await NOTIFICATIONS.paymentConfirmedByEmployer(job.worker, job._id, job.title);

    res.json({ success: true, message: 'Payment confirmed. Waiting for worker confirmation.', job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────── Worker: Confirm Payment Received ───────────────

exports.confirmPaymentReceived = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findOne({ _id: jobId, worker: req.user._id });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (!job.paymentConfirmedByEmployer) return res.status(400).json({ success: false, message: 'Employer has not confirmed payment yet' });

    job.paymentConfirmedByWorker = true;
    job.status = JOB_STATUS.COMPLETED;
    await job.save();

    // Update stats, honour scores, and auto-turn ON availability on job completion
    await Worker.findByIdAndUpdate(req.user._id, { $inc: { completedJobs: 1, pendingJobs: -1 }, availabilityStatus: true });
    await Employer.findByIdAndUpdate(job.employer, { $inc: { completedJobs: 1, activeJobs: -1 } });
    await updateHonourScore(req.user._id, 'worker', 'JOB_COMPLETED');
    await updateHonourScore(job.employer, 'employer', 'JOB_COMPLETED');

    await NOTIFICATIONS.paymentConfirmedByWorker(job.employer, job._id, job.title);

    res.json({ success: true, message: 'Payment confirmed. Job completed!', job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────── Get Jobs ───────────────

exports.getWorkerJobs = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { worker: req.user._id, isHidden: { $ne: true } };
    if (status) {
      // Support comma-separated multiple statuses: ?status=ACCEPTED,WORKING
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      query.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }

    const jobs = await Job.find(query)
      .populate('employer', 'name mobile employerCategoryName honourScore')
      .sort({ createdAt: -1 });

    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getWorkerRequests = async (req, res) => {
  try {
    const requests = await JobRequest.find({ worker: req.user._id, status: 'PENDING' })
      .populate({ path: 'job', populate: { path: 'employer', select: 'name mobile employerCategoryName honourScore' } })
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
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
      .populate('worker', 'name mobile workerTypeName honourScore')
      .sort({ createdAt: -1 });

    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.searchWorkers = async (req, res) => {
  try {
    const { workerType, pincode, page = 1, limit = 10 } = req.query;
    const query = { isVerified: true, isActive: true, availabilityStatus: true };
    if (workerType) query.workerTypeName = { $regex: workerType, $options: 'i' };
    if (pincode) query.pincode = pincode;

    const workers = await Worker.find(query)
      .select('name workerTypeName experience honourScore pincode address availabilityStatus')
      .sort({ honourScore: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Worker.countDocuments(query);
    res.json({ success: true, workers, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
