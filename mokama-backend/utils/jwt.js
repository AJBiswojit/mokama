const jwt = require('jsonwebtoken');

// Short-lived access token — 15 minutes
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
};

// Long-lived refresh token — 30 days
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
};

// Generate both at once — used on login/register
const generateTokens = (payload) => ({
  accessToken:  generateAccessToken(payload),
  refreshToken: generateRefreshToken(payload),
});

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

// Backward compat — old code that calls generateToken still works
const generateToken = generateAccessToken;

module.exports = {
  generateToken,
  generateTokens,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
};
