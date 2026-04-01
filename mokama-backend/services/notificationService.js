const Notification = require('../models/Notification');

const createNotification = async ({ userId, userType, title, message, type, relatedJob }) => {
  try {
    await Notification.create({ userId, userType, title, message, type, relatedJob });
  } catch (err) {
    console.error('Notification creation error:', err.message);
  }
};

const NOTIFICATIONS = {
  jobRequestSent: (workerId, jobId, jobTitle) => createNotification({
    userId: workerId, userType: 'worker',
    title: 'New Job Request',
    message: `You have a new job request for "${jobTitle}"`,
    type: 'JOB_REQUEST', relatedJob: jobId
  }),
  jobAccepted: (employerId, jobId, workerName) => createNotification({
    userId: employerId, userType: 'employer',
    title: 'Request Accepted',
    message: `${workerName} accepted your job request`,
    type: 'JOB_ACCEPTED', relatedJob: jobId
  }),
  jobRejected: (employerId, jobId, workerName) => createNotification({
    userId: employerId, userType: 'employer',
    title: 'Request Rejected',
    message: `${workerName} rejected your job request`,
    type: 'JOB_REJECTED', relatedJob: jobId
  }),
  workStarted: (workerId, jobId, jobTitle) => createNotification({
    userId: workerId, userType: 'worker',
    title: 'Work Started',
    message: `Employer has confirmed work started for "${jobTitle}"`,
    type: 'WORK_STARTED', relatedJob: jobId
  }),
  workCompleted: (employerId, jobId, workerName) => createNotification({
    userId: employerId, userType: 'employer',
    title: 'Work Completed',
    message: `${workerName} has marked work as completed. Please confirm payment.`,
    type: 'WORK_COMPLETED', relatedJob: jobId
  }),
  paymentPending: (workerId, jobId, jobTitle) => createNotification({
    userId: workerId, userType: 'worker',
    title: 'Payment Pending',
    message: `Payment is pending for "${jobTitle}". Employer has been notified.`,
    type: 'PAYMENT_PENDING', relatedJob: jobId
  }),
  paymentConfirmedByEmployer: (workerId, jobId, jobTitle) => createNotification({
    userId: workerId, userType: 'worker',
    title: 'Payment Sent',
    message: `Employer confirmed payment for "${jobTitle}". Please confirm receipt.`,
    type: 'PAYMENT_CONFIRMED', relatedJob: jobId
  }),
  paymentConfirmedByWorker: (employerId, jobId, jobTitle) => createNotification({
    userId: employerId, userType: 'employer',
    title: 'Job Completed',
    message: `Worker confirmed payment received for "${jobTitle}". Job closed successfully.`,
    type: 'PAYMENT_CONFIRMED', relatedJob: jobId
  }),
};

module.exports = { createNotification, NOTIFICATIONS };
