const mongoose = require('mongoose');

const jobRequestSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employer', required: true },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
    default: 'PENDING'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  },
  workerNote: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('JobRequest', jobRequestSchema);
