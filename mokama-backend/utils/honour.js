const Worker     = require('../models/Worker');
const Employer   = require('../models/Employer');
const HonourLog  = require('../models/HonourLog');

const HONOUR_EVENTS = {
  JOB_COMPLETED:             { change: +5,  reason: 'Job completed successfully' },
  QUICK_RESPONSE:            { change: +2,  reason: 'Quick response to job request' },
  TIMELY_PAYMENT:            { change: +3,  reason: 'Timely payment confirmed' },
  REQUEST_IGNORED:           { change: -3,  reason: 'Job request ignored' },
  NO_RESPONSE:               { change: -5,  reason: 'No response to job request' },
  PAYMENT_DELAYED:           { change: -4,  reason: 'Payment delayed beyond 24 hours' },
  DISPUTE_RAISED:            { change: -3,  reason: 'Dispute raised on job' },
  DISPUTE_RESOLVED_IN_FAVOUR:{ change: +2,  reason: 'Dispute resolved in favour' },
  ADMIN_PENALISE:            { change: -5,  reason: 'Penalised by admin' },
  ADMIN_INCREASE:            { change: +5,  reason: 'Score increased by admin' },
};

const updateHonourScore = async (userId, userType, event, source = 'system') => {
  const eventData = typeof event === 'string'
    ? HONOUR_EVENTS[event]
    : event; // allow passing { change, reason } directly

  if (!eventData || eventData.change === 0) return;

  const Model = userType === 'worker' ? Worker : Employer;
  const user  = await Model.findById(userId);
  if (!user) return;

  const oldScore = user.honourScore;
  user.honourScore = Math.max(0, Math.min(100, oldScore + eventData.change));
  await user.save();

  // Log the change — fire and forget, never block main flow
  HonourLog.create({
    userId,
    userType,
    change:   eventData.change,
    reason:   eventData.reason,
    newScore: user.honourScore,
    source,
  }).catch(err => console.error('HonourLog create error:', err.message));

  return { newScore: user.honourScore, change: eventData.change };
};

const getHonourLabel = (score) => {
  if (score >= 85) return { label: 'Excellent',    color: '#22c55e' };
  if (score >= 70) return { label: 'Good',         color: '#84cc16' };
  if (score >= 50) return { label: 'Average',      color: '#f59e0b' };
  if (score >= 30) return { label: 'Below Average',color: '#f97316' };
  return              { label: 'Poor',          color: '#ef4444' };
};

module.exports = { updateHonourScore, getHonourLabel, HONOUR_EVENTS };
