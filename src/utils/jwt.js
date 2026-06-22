const jwt = require('jsonwebtoken');

/**
 * Genera un access token JWT.
 * @param {{ id: string, role: string }} payload
 * @returns {string}
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

/**
 * Genera un refresh token JWT.
 * @param {{ id: string }} payload
 * @returns {string}
 */
function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

/**
 * Verifica un access token.
 * @param {string} token
 * @returns {Object}
 */
function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

/**
 * Verifica un refresh token.
 * @param {string} token
 * @returns {Object}
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };
