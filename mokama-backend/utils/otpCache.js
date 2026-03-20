/**
 * In-memory OTP cache — replaces DB reads/writes for OTP storage.
 * Uses a simple Map with per-entry TTL. No Redis needed.
 * Data lives only in process memory — resets on server restart (acceptable for OTPs).
 */

const _store = new Map(); // key → { otp, expiresAt, attempts }

const OTP_TTL_MS   = 5 * 60 * 1000;  // 5 minutes
const MAX_ATTEMPTS = 5;               // max wrong attempts before invalidation

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of _store.entries()) {
    if (val.expiresAt < now) _store.delete(key);
  }
}, 10 * 60 * 1000);

const set = (mobile, otp) => {
  _store.set(mobile, {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts:  0,
  });
};

const verify = (mobile, otp) => {
  const entry = _store.get(mobile);
  if (!entry) return { valid: false, reason: 'No OTP found. Please request a new one.' };
  if (Date.now() > entry.expiresAt) {
    _store.delete(mobile);
    return { valid: false, reason: 'OTP has expired. Please request a new one.' };
  }
  entry.attempts++;
  if (entry.attempts > MAX_ATTEMPTS) {
    _store.delete(mobile);
    return { valid: false, reason: 'Too many incorrect attempts. Please request a new OTP.' };
  }
  if (entry.otp !== otp) {
    return { valid: false, reason: `Invalid OTP. ${MAX_ATTEMPTS - entry.attempts} attempt(s) remaining.` };
  }
  _store.delete(mobile); // consumed — single use
  return { valid: true };
};

const del = (mobile) => _store.delete(mobile);

const has = (mobile) => {
  const entry = _store.get(mobile);
  return entry && Date.now() < entry.expiresAt;
};

module.exports = { set, verify, del, has };
