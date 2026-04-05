const mongoose = require('mongoose');

const geoSchema = new mongoose.Schema({
  state:    { type: String, required: true, index: true },
  district: { type: String, required: true, index: true },
  block:    { type: String, required: true },
}, { timestamps: false });

geoSchema.index({ state: 1, district: 1 });

module.exports = mongoose.model('Geo', geoSchema);