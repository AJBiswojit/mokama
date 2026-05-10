/**
 * utils/penaltyEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Progressive penalty system.
 * First offence → warning email only, no score change.
 * Repeat offences within cooldown window → escalating penalties.
 *
 * Rules:
 *   1st offence → warning  (0 points)
 *   2nd offence → minor    (small deduction)
 *   3rd+ offence → major   (significant deduction)
 *
 * Cooldown resets after N days of clean behaviour.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const OffenceLog        = require('../models/OffenceLog');
const { updateHonourScore } = require('./honour');
const { sendEmail }     = require('./emailOtp');
const Worker            = require('../models/Worker');
const Employer          = require('../models/Employer');

// ─── Offence rules ────────────────────────────────────────────────────────────
// cooldownDays: how long before offence history resets for this type
// penalties:    [warning_points, minor_points, major_points]
const OFFENCE_RULES = {
  NO_SHOW:        { cooldownDays: 60,  penalties: [0, -5, -15],  suspendAt: 3 },
  LATE_LOG:       { cooldownDays: 30,  penalties: [0, -2,  -5],  suspendAt: 5 },
  LATE_PAYMENT:   { cooldownDays: 30,  penalties: [0, -3,  -8],  suspendAt: 4 },
  LATE_APPROVAL:  { cooldownDays: 30,  penalties: [0, -2,  -5],  suspendAt: 5 },
  FAKE_ARRIVAL:   { cooldownDays: 90,  penalties: [-5, -15, -25], suspendAt: 2 },
  DISPUTE_ABUSE:  { cooldownDays: 90,  penalties: [-5, -10, -20], suspendAt: 2 },
  LATE_CONFIRM:   { cooldownDays: 30,  penalties: [0, -1,  -3],  suspendAt: 6 },
};

// ─── Warning email templates ───────────────────────────────────────────────────
function warningEmailHtml(userName, offenceType, jobTitle, message) {
  return `
    <div style="font-family:Arial;max-width:520px;margin:0 auto;background:#0a0a0a;
                color:#f0f0f0;padding:32px;border-radius:16px;border:1px solid #2a2a2a;">
      <h2 style="color:#f59e0b;margin:0 0 4px;">⚠️ Account Warning</h2>
      <p style="color:#6b6b6b;margin:0 0 20px;font-size:13px;">MoKama Platform Notice</p>
      <p>Hi <strong>${userName}</strong>,</p>
      <p style="color:#a0a0a0;line-height:1.6;">${message}</p>
      <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;
                  padding:16px;margin:20px 0;">
        <p style="margin:0 0 4px;font-size:12px;color:#6b6b6b;text-transform:uppercase;
                   letter-spacing:0.05em;">Affected Job</p>
        <p style="margin:0;font-weight:bold;color:#fff;">${jobTitle}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b6b6b;">${offenceType}</p>
      </div>
      <p style="color:#6b6b6b;font-size:13px;">
        This is a warning — no score deduction this time. Repeated occurrences will
        affect your Honour Score and platform access.
      </p>
      <a href="${process.env.FRONTEND_URL}"
         style="display:inline-block;margin-top:16px;padding:12px 28px;
                background:#f59e0b;color:white;border-radius:8px;
                text-decoration:none;font-weight:bold;font-size:14px;">
        Open MoKama
      </a>
    </div>`;
}

function penaltyEmailHtml(userName, offenceType, jobTitle, pointsDelta, newScore, message) {
  return `
    <div style="font-family:Arial;max-width:520px;margin:0 auto;background:#0a0a0a;
                color:#f0f0f0;padding:32px;border-radius:16px;border:1px solid #2a2a2a;">
      <h2 style="color:#ef4444;margin:0 0 4px;">📉 Honour Score Penalty</h2>
      <p style="color:#6b6b6b;margin:0 0 20px;font-size:13px;">MoKama Platform Notice</p>
      <p>Hi <strong>${userName}</strong>,</p>
      <p style="color:#a0a0a0;line-height:1.6;">${message}</p>
      <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;
                  padding:16px;margin:20px 0;display:flex;justify-content:space-between;">
        <div>
          <p style="margin:0 0 4px;font-size:12px;color:#6b6b6b;">Score Change</p>
          <p style="margin:0;font-size:22px;font-weight:900;color:#ef4444;">${pointsDelta}</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0 0 4px;font-size:12px;color:#6b6b6b;">New Score</p>
          <p style="margin:0;font-size:22px;font-weight:900;color:#fff;">${newScore}/100</p>
        </div>
      </div>
      <p style="color:#6b6b6b;font-size:13px;">
        Maintain good practices to recover your score. Repeated violations may
        result in account suspension.
      </p>
      <a href="${process.env.FRONTEND_URL}"
         style="display:inline-block;margin-top:16px;padding:12px 28px;
                background:#ff2400;color:white;border-radius:8px;
                text-decoration:none;font-weight:bold;font-size:14px;">
        Open MoKama
      </a>
    </div>`;
}

// ─── Core: assess penalty tier ────────────────────────────────────────────────
async function assessPenaltyTier(userId, role, offenceType) {
  const rule = OFFENCE_RULES[offenceType];
  if (!rule) throw new Error(`Unknown offence type: ${offenceType}`);

  const cutoff = new Date(Date.now() - rule.cooldownDays * 24 * 60 * 60 * 1000);

  // Count recent offences of the same type within cooldown window
  const recentCount = await OffenceLog.countDocuments({
    userId,
    offenceType,
    issuedAt: { $gt: cutoff },
  });

  let tier, severity, pointsDelta;

  if (recentCount === 0) {
    tier        = 0;
    severity    = 'warning';
    pointsDelta = rule.penalties[0];
  } else if (recentCount === 1) {
    tier        = 1;
    severity    = 'minor';
    pointsDelta = rule.penalties[1];
  } else {
    tier        = 2;
    severity    = 'major';
    pointsDelta = rule.penalties[2];
  }

  return {
    tier,
    severity,
    pointsDelta,
    recentCount,
    isWarningOnly: severity === 'warning' && pointsDelta === 0,
    cooldownDays:  rule.cooldownDays,
    suspendAt:     rule.suspendAt,
  };
}

// ─── Core: apply penalty ──────────────────────────────────────────────────────
/**
 * Main function called by cron and controllers.
 *
 * @param {ObjectId} userId
 * @param {'worker'|'employer'} role
 * @param {string} offenceType  - key from OFFENCE_RULES
 * @param {ObjectId} jobId
 * @param {string} jobTitle
 * @returns {Object} result of what was applied
 */
async function applyPenalty(userId, role, offenceType, jobId, jobTitle = 'Unknown Job') {
  const assessment = await assessPenaltyTier(userId, role, offenceType);
  const Model      = role === 'worker' ? Worker : Employer;
  const user       = await Model.findById(userId).select('name email honourScore');

  if (!user) return { applied: false, reason: 'User not found' };

  const cooldownEnds = new Date(
    Date.now() + OFFENCE_RULES[offenceType].cooldownDays * 24 * 60 * 60 * 1000
  );

  // ── Warning — no score change ──────────────────────────────────────────────
  if (assessment.isWarningOnly) {
    await OffenceLog.create({
      userId, role, jobId, offenceType,
      severity:      'warning',
      pointsDelta:   0,
      scoreAfter:    user.honourScore,
      isWarningOnly: true,
      cooldownEnds,
    });

    const message = `You received a warning for: ${offenceType.replace(/_/g, ' ').toLowerCase()} `
      + `on job "${jobTitle}". This is your first occurrence — no score deduction this time. `
      + `Please ensure this does not happen again.`;

    sendEmail(
      user.email,
      '⚠️ Account Warning | MoKama',
      warningEmailHtml(user.name, offenceType, jobTitle, message)
    ).catch(() => {});

    console.log(`[penalty] WARNING issued to ${role} ${userId} for ${offenceType} (job: ${jobId})`);
    return { applied: true, severity: 'warning', pointsDelta: 0, isWarningOnly: true };
  }

  // ── Minor / Major — apply score deduction ──────────────────────────────────
  const pointsDelta = assessment.pointsDelta;
  const newScore    = await updateHonourScore(userId, role, offenceType, pointsDelta);

  await OffenceLog.create({
    userId, role, jobId, offenceType,
    severity:      assessment.severity,
    pointsDelta,
    scoreAfter:    newScore,
    isWarningOnly: false,
    cooldownEnds,
    note:          `Occurrence ${assessment.recentCount + 1} within ${assessment.cooldownDays}d window`,
  });

  const message = assessment.severity === 'major'
    ? `This is a repeated violation (${assessment.recentCount + 1}x within ${assessment.cooldownDays} days). `
      + `A major penalty of ${pointsDelta} has been applied to your Honour Score.`
    : `Your Honour Score has been reduced by ${Math.abs(pointsDelta)} points for: `
      + `${offenceType.replace(/_/g, ' ').toLowerCase()} on "${jobTitle}".`;

  sendEmail(
    user.email,
    '📉 Honour Score Penalty | MoKama',
    penaltyEmailHtml(user.name, offenceType, jobTitle, pointsDelta, newScore, message)
  ).catch(() => {});

  // ── Check if should suggest suspension to admin ───────────────────────────
  const totalViolations = await OffenceLog.countDocuments({ userId, severity: { $ne: 'warning' } });
  if (totalViolations >= OFFENCE_RULES[offenceType].suspendAt) {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      sendEmail(adminEmail,
        `🚨 User Suspension Review | ${role} ${user.name} | MoKama`,
        `<div style="font-family:Arial;background:#0a0a0a;color:#f0f0f0;padding:24px;border-radius:12px;">
          <h2 style="color:#ef4444;">Suspension Review Required</h2>
          <p><strong>${role}</strong>: ${user.name} (ID: ${userId})</p>
          <p>Total violations: <strong>${totalViolations}</strong></p>
          <p>Threshold for this offence type: <strong>${OFFENCE_RULES[offenceType].suspendAt}</strong></p>
          <p>Latest offence: <strong>${offenceType}</strong> on job: ${jobTitle}</p>
          <a href="${process.env.FRONTEND_URL}/admin/dashboard"
             style="display:inline-block;padding:12px 24px;background:#ef4444;
                    color:white;border-radius:8px;text-decoration:none;">
            Review in Admin Panel
          </a>
        </div>`
      ).catch(() => {});
    }
  }

  console.log(`[penalty] ${assessment.severity.toUpperCase()} applied to ${role} ${userId}: ${pointsDelta} points (${offenceType})`);

  return {
    applied:   true,
    severity:  assessment.severity,
    pointsDelta,
    newScore,
    isWarningOnly: false,
    suspensionAlert: totalViolations >= OFFENCE_RULES[offenceType].suspendAt,
  };
}

// ─── Send reminder (not a penalty) ────────────────────────────────────────────
async function sendReminder(userId, role, jobTitle, message) {
  const Model = role === 'worker' ? Worker : Employer;
  const user  = await Model.findById(userId).select('name email');
  if (!user?.email) return;

  sendEmail(user.email, `⏰ Action Required | MoKama`,
    `<div style="font-family:Arial;max-width:520px;margin:0 auto;background:#0a0a0a;
                color:#f0f0f0;padding:32px;border-radius:16px;border:1px solid #2a2a2a;">
      <h2 style="color:#ff2400;">Action Required</h2>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p style="color:#a0a0a0;line-height:1.6;">${message}</p>
      <p style="color:#a0a0a0;font-size:13px;">Job: <strong style="color:#fff;">${jobTitle}</strong></p>
      <a href="${process.env.FRONTEND_URL}"
         style="display:inline-block;margin-top:16px;padding:12px 28px;
                background:#ff2400;color:white;border-radius:8px;
                text-decoration:none;font-weight:bold;">
        Open MoKama
      </a>
    </div>`
  ).catch(() => {});
}

module.exports = { applyPenalty, assessPenaltyTier, sendReminder, OFFENCE_RULES };
