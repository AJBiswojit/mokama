const mongoose = require('mongoose');

const workerTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const employerCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const WorkerType = mongoose.model('WorkerType', workerTypeSchema);
const EmployerCategory = mongoose.model('EmployerCategory', employerCategorySchema);

// Seed defaults
async function seedDefaults() {
  const workerTypes = [
    'Mason', 'Carpenter', 'Electrician', 'Plumber', 'Painter',
    'Welder', 'Helper/Labourer', 'Driver', 'Gardener', 'Security Guard',
    'Housekeeping', 'Cook', 'Tailor', 'Mechanic', 'Loader/Unloader'
  ];

  const employerCategories = [
    'Individual / Household', 'Construction Company', 'Factory / Industry',
    'Farm Owner', 'Shop / Retail', 'Restaurant / Hotel', 'IT Company',
    'Government Contractor', 'NGO / Social Organization', 'Other'
  ];

  for (const name of workerTypes) {
    await WorkerType.findOneAndUpdate({ name }, { name }, { upsert: true });
  }

  for (const name of employerCategories) {
    await EmployerCategory.findOneAndUpdate({ name }, { name }, { upsert: true });
  }
}

setTimeout(seedDefaults, 3000);

module.exports = { WorkerType, EmployerCategory };
