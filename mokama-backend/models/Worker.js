const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  fatherName:     { type: String, required: true, trim: true },
  gender:         { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  dob:            { type: Date, required: true },
  mobile:         { type: String, required: true, unique: true, sparse: true, trim: true },
  email:          { type: String, required: true, unique: true, sparse: true, trim: true, lowercase: true },
  address:        { type: String, required: true },
  pincode:        { type: String, required: true },
  workerType:     { type: mongoose.Schema.Types.ObjectId, ref: 'WorkerType' },
  workerTypeName: { type: String },
  experience:     { type: Number, default: 0 },
  labourCardNumber: { type: String, default: '' },

  // Auth
  isVerified:       { type: Boolean, default: false },
  isEmailVerified:  { type: Boolean, default: false },
  emailOtp:         { type: String },
  emailOtpExpiry:   { type: Date },

  // Approval
  status:   { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  isActive: { type: Boolean, default: true },

  // Platform
  availabilityStatus: { type: Boolean, default: false },
  honourScore:        { type: Number, default: 50, min: 0, max: 100 },
  completedJobs:      { type: Number, default: 0 },
  pendingJobs:        { type: Number, default: 0 },
  role:               { type: String, default: 'worker' },

  // Soft delete
  isDeleted:  { type: Boolean, default: false },
  deletedAt:  { type: Date, default: null },
  deleteNote: { type: String, default: '' }
}, { timestamps: true });

workerSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.emailOtp;
  delete obj.emailOtpExpiry;
  return obj;
};

module.exports = mongoose.model('Worker', workerSchema);
