const mongoose = require('mongoose');

const employerSchema = new mongoose.Schema({
  name:                    { type: String, required: true, trim: true },
  mobile:                  { type: String, required: true, unique: true, sparse: true, trim: true },
  email:                   { type: String, required: true, unique: true, sparse: true, trim: true, lowercase: true },
  address:                 { type: String, required: true },
  pincode:                 { type: String, default: '' },

  // Type — individual or organisation
  employerType:            { type: String, enum: ['individual', 'organisation'], default: 'individual' },

  // Individual-specific
  fatherName:              { type: String, default: '' },
  gender:                  { type: String, enum: ['male', 'female', 'other', ''], default: '' },
  dob:                     { type: Date, default: null },

  // Organisation-specific
  establishmentDate:       { type: Date, default: null },
  gstNumber:               { type: String, default: '' },
  labourLicenseNumber:     { type: String, default: '' },

  // Location
  state:                   { type: String, default: '' },
  district:                { type: String, default: '' },
  block:                   { type: String, default: '' },

  // Category
  employerCategory:        { type: mongoose.Schema.Types.ObjectId, ref: 'EmployerCategory' },
  employerCategoryName:    { type: String, default: '' },
  employerSubcategory:     { type: String, default: '' },
  labourCardNumber:        { type: String, default: '' },

  // Auth
  isVerified:      { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  emailOtp:        { type: String },
  emailOtpExpiry:  { type: Date },

  // Approval
  status:   { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  isActive: { type: Boolean, default: true },

  // Platform
  honourScore:   { type: Number, default: 50, min: 0, max: 100 },
  completedJobs: { type: Number, default: 0 },
  activeJobs:    { type: Number, default: 0 },
  role:          { type: String, default: 'employer' },

  // Soft delete
  isDeleted:  { type: Boolean, default: false },
  deletedAt:  { type: Date,    default: null },
  deleteNote: { type: String,  default: '' },
}, { timestamps: true });

employerSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.emailOtp;
  delete obj.emailOtpExpiry;
  return obj;
};

module.exports = mongoose.model('Employer', employerSchema);
