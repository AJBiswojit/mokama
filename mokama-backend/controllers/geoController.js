const Geo = require('../models/Geo');

// GET /api/geo/states
exports.getStates = async (req, res) => {
  try {
    const states = await Geo.distinct('state');
    res.json({ success: true, states: states.sort() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/geo/districts?state=Odisha
exports.getDistricts = async (req, res) => {
  try {
    const { state } = req.query;
    if (!state) return res.status(400).json({ success: false, message: 'state is required' });
    const districts = await Geo.distinct('district', { state });
    res.json({ success: true, districts: districts.sort() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/geo/blocks?state=Odisha&district=Khordha
exports.getBlocks = async (req, res) => {
  try {
    const { state, district } = req.query;
    if (!state || !district) return res.status(400).json({ success: false, message: 'state and district are required' });
    const blocks = await Geo.distinct('block', { state, district });
    res.json({ success: true, blocks: blocks.sort() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};