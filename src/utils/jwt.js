/**
 * @fileoverview Utilidades de generación y verificación de tokens JWT.
 *
 * Responsabilidad:
 * Centraliza la creación y validación de tokens JWT para el sistema
 * de autenticación con doble token (access + refresh).
 *
 * Estrategia de tokens:
 * - Access token: corta duración (15min por defecto). Contiene solo { id }.
 *   Se envía en cada petición vía header Authorization: Bearer <token>.
 * - Refresh token: larga duración (7d por defecto). Contiene solo { id }.
 *   Se usa para obtener un nuevo par de tokens sin re-autenticarse.
 *   Se almacena hasheado en la DB del usuario.
 *
 * Decisión de diseño:
 * Los permisos NO se incluyen en el JWT. Se consultan desde la DB + cache
 * en cada petición autenticada. Esto permite revocar permisos en tiempo real
 * sin esperar a que el token expire.
 *
 * Variables de entorno requeridas:
 * - JWT_SECRET: clave secreta para access tokens.
 * - JWT_REFRESH_SECRET: clave secreta para refresh tokens (debe ser diferente).
 * - JWT_EXPIRES_IN: duración del access token (default: '15m').
 * - JWT_REFRESH_EXPIRES_IN: duración del refresh token (default: '7d').
 */

const jwt = require('jsonwebtoken');

/**
 * Genera un access token JWT de corta duración.
 *
 * @param {{ id: string }} payload - Solo el ID del usuario.
 * @returns {string} Token JWT firmado.
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

/**
 * Genera un refresh token JWT de larga duración.
 *
 * @param {{ id: string }} payload - Solo el ID del usuario.
 * @returns {string} Token JWT firmado.
 */
function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

/**
 * Verifica y decodifica un access token.
 *
 * @param {string} token - Token JWT a verificar.
 * @returns {{ id: string, iat: number, exp: number }} Payload decodificado.
 * @throws {JsonWebTokenError} Si el token es inválido.
 * @throws {TokenExpiredError} Si el token expiró.
 */
function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

/**
 * Verifica y decodifica un refresh token.
 *
 * @param {string} token - Token JWT a verificar.
 * @returns {{ id: string, iat: number, exp: number }} Payload decodificado.
 * @throws {JsonWebTokenError} Si el token es inválido.
 * @throws {TokenExpiredError} Si el token expiró.
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };
