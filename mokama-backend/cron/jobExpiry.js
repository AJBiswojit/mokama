const cron = require('node-cron');
const JobRequest = require('../models/JobRequest');
const Job = require('../models/Job');
const { JOB_STATUS } = require('../models/Job');
const { updateHonourScore } = require('../utils/honour');

// Run every 2 minutes to expire old job requests
cron.schedule('*/2 * * * *', async () => {
  try {
    const expiredRequests = await JobRequest.find({
      status: 'PENDING',
      expiresAt: { $lt: new Date() }
    });

    for (const request of expiredRequests) {
      request.status = 'EXPIRED';
      await request.save();

      // Penalise worker for not responding
      await updateHonourScore(request.worker, 'worker', 'NO_RESPONSE');

      // Reopen the job
      await Job.findByIdAndUpdate(request.job, {
        status: JOB_STATUS.OPEN,
        worker: null
      });
    }

    if (expiredRequests.length > 0) {
      console.log(`⏰ Expired ${expiredRequests.length} job request(s)`);
    }
  } catch (err) {
    console.error('Cron error (job expiry):', err.message);
  }
});

// Run every hour to check payment delays
cron.schedule('0 * * * *', async () => {
  try {
    const stuckJobs = await Job.find({
      status: JOB_STATUS.PAYMENT_PENDING,
      workCompletedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24 hours
    });

    for (const job of stuckJobs) {
      await updateHonourScore(job.employer, 'employer', 'PAYMENT_DELAYED');
    }

    if (stuckJobs.length > 0) {
      console.log(`⚠️ Penalised ${stuckJobs.length} employer(s) for payment delay`);
    }
  } catch (err) {
    console.error('Cron error (payment check):', err.message);
  }
});

console.log('✅ Cron jobs registered');
