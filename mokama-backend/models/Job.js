const mongoose = require('mongoose');

const JOB_STATUS = {
  OPEN: 'OPEN',
  REQUEST_SENT: 'REQUEST_SENT',
  ACCEPTED: 'ACCEPTED',
  WORKING: 'WORKING',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
};

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  workerType: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkerType', required: false, default: null },
  workerTypeName: { type: String },
  address: { type: String, required: true },
  pincode: { type: String, required: true },
  wage: { type: Number, required: true },
  startDate: { type: Date, required: true },
  description: { type: String, default: '' },
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employer', required: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', default: null },
  status: {
    type: String,
    enum: Object.values(JOB_STATUS),
    default: JOB_STATUS.OPEN
  },
  workStartedAt: { type: Date },
  workCompletedAt: { type: Date },
  paymentConfirmedByEmployer: { type: Boolean, default: false },
  paymentConfirmedByWorker: { type: Boolean, default: false },
  disputeFlag: { type: Boolean, default: false },
  disputeNote: { type: String, default: '' },
  adminNote:  { type: String, default: '' },
  isHidden:   { type: Boolean, default: false }   // admin can hide without destroying data
}, { timestamps: true });

jobSchema.statics.JOB_STATUS = JOB_STATUS;

module.exports = mongoose.model('Job', jobSchema);
module.exports.JOB_STATUS = JOB_STATUS;
