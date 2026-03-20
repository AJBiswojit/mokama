const Worker = require('../models/Worker');
const Employer = require('../models/Employer');

const HONOUR_EVENTS = {
  JOB_COMPLETED: +5,
  QUICK_RESPONSE: +2,
  TIMELY_PAYMENT: +3,
  REQUEST_IGNORED: -3,
  NO_RESPONSE: -5,
  PAYMENT_DELAYED: -4,
  DISPUTE_RAISED: -3,
  DISPUTE_RESOLVED_IN_FAVOUR: +2
};

const updateHonourScore = async (userId, userType, event) => {
  const change = HONOUR_EVENTS[event] || 0;
  if (change === 0) return;

  const Model = userType === 'worker' ? Worker : Employer;
  const user = await Model.findById(userId);
  if (!user) return;

  user.honourScore = Math.max(0, Math.min(100, user.honourScore + change));
  await user.save();

  return { newScore: user.honourScore, change, event };
};

const getHonourLabel = (score) => {
  if (score >= 85) return { label: 'Excellent', color: '#22c55e' };
  if (score >= 70) return { label: 'Good', color: '#84cc16' };
  if (score >= 50) return { label: 'Average', color: '#f59e0b' };
  if (score >= 30) return { label: 'Below Average', color: '#f97316' };
  return { label: 'Poor', color: '#ef4444' };
};

module.exports = { updateHonourScore, getHonourLabel, HONOUR_EVENTS };
