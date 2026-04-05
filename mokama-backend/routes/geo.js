const express = require('express');
const router  = express.Router();
const { getStates, getDistricts, getBlocks } = require('../controllers/geoController');

// Public routes — no auth needed (used on register form)
router.get('/states',    getStates);
router.get('/districts', getDistricts);
router.get('/blocks',    getBlocks);

module.exports = router;
