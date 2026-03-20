const Job = require('../models/Job');
const JobRequest = require('../models/JobRequest');
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const { JOB_STATUS } = require('../models/Job');
const { updateHonourScore } = require('../utils/honour');
const { NOTIFICATIONS } = require('../services/notificationService');

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

    // Check for existing pending request
    const existing = await JobRequest.findOne({ job: jobId, worker: workerId, status: 'PENDING' });
    if (existing) return res.status(400).json({ success: false, message: 'Request already sent' });

    const expiryMinutes = parseInt(process.env.JOB_REQUEST_EXPIRY_MINUTES) || 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const request = await JobRequest.create({
      job: jobId, worker: workerId, employer: req.user._id, expiresAt
    });

    job.status = JOB_STATUS.REQUEST_SENT;
    job.worker = workerId;
    await job.save();

    await NOTIFICATIONS.jobRequestSent(workerId, jobId, job.title);
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
    const query = { worker: req.user._id };
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
    const query = { employer: req.user._id };
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
