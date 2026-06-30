/**
 * @fileoverview Servicio de autenticación con JWT y refresh tokens.
 *
 * Responsabilidad:
 * Maneja registro, login, renovación de tokens y logout.
 * Implementa bloqueo de cuenta tras intentos fallidos.
 *
 * Seguridad:
 * - Las contraseñas se hashean vía el hook pre-save de User (bcrypt 12 rounds).
 * - Los refresh tokens se almacenan hasheados en DB (bcrypt 10 rounds).
 * - Al renovar tokens se rota el refresh token (el anterior queda inválido).
 * - El access token solo contiene { id }, los permisos se consultan desde DB.
 */

const User = require('../models/User');
const Role = require('../models/Role');
const UserRole = require('../models/UserRole');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { getUserRoleNames } = require('./permission.service');
const AppError = require('../utils/AppError');
const bcrypt = require('bcrypt');

/** Intentos máximos antes de bloquear la cuenta */
const MAX_LOGIN_ATTEMPTS = 5;

/** Duración del bloqueo temporal (15 minutos) */
const LOCK_TIME_MS = 15 * 60 * 1000;

/**
 * Registra un nuevo usuario y le asigna el rol USER por defecto.
 *
 * Flujo:
 * 1. Verifica que el email no exista.
 * 2. Crea el usuario (la contraseña se hashea automáticamente vía hook pre-save).
 * 3. Busca el rol USER y lo asigna vía UserRole.
 * 4. Genera access token + refresh token.
 * 5. Almacena el refresh token hasheado en DB.
 *
 * @param {{ name: string, email: string, password: string }} data
 * @returns {Promise<{ user: Object, roles: string[], token: string, refreshToken: string }>}
 * @throws {AppError} 409 si el email ya está registrado.
 */
async function register({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('Este correo ya está registrado', 409);
  }

  const user = await User.create({ name, email, password });

  const defaultRole = await Role.findOne({ name: 'USER', active: true });
  if (defaultRole) {
    await UserRole.create({ user: user._id, role: defaultRole._id });
  }

  const roles = await getUserRoleNames(user._id);
  const token = generateAccessToken({ id: user._id });
  const refreshToken = generateRefreshToken({ id: user._id });

  user.refreshToken = await bcrypt.hash(refreshToken, 10);
  await user.save();

  return { user, roles, token, refreshToken };
}

/**
 * Inicia sesión verificando credenciales y bloqueo de cuenta.
 *
 * Flujo:
 * 1. Busca el usuario por email (incluye campos sensibles con select+).
 * 2. Verifica que la cuenta no esté bloqueada temporalmente.
 * 3. Verifica que la cuenta esté activa.
 * 4. Compara la contraseña con bcrypt.
 * 5. Si falla: incrementa loginAttempts. Al llegar a MAX_LOGIN_ATTEMPTS bloquea 15 min.
 * 6. Si es correcta: resetea intentos, genera tokens, obtiene roles.
 *
 * @param {{ email: string, password: string }} data
 * @returns {Promise<{ user: Object, roles: string[], token: string, refreshToken: string }>}
 * @throws {AppError} 401 credenciales inválidas, 403 cuenta desactivada, 423 cuenta bloqueada.
 */
async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');
  if (!user) {
    throw new AppError('Credenciales inválidas', 401);
  }

  if (user.lockUntil && user.lockUntil > Date.now()) {
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw new AppError(`Cuenta bloqueada temporalmente. Intenta en ${minutesLeft} minutos`, 423);
  }

  if (user.status !== 'active') {
    throw new AppError('Cuenta desactivada', 403);
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
      user.loginAttempts = 0;
    }
    await user.save();
    throw new AppError('Credenciales inválidas', 401);
  }

  user.loginAttempts = 0;
  user.lockUntil = undefined;

  const roles = await getUserRoleNames(user._id);
  const token = generateAccessToken({ id: user._id });
  const refreshToken = generateRefreshToken({ id: user._id });

  user.refreshToken = await bcrypt.hash(refreshToken, 10);
  await user.save();

  return { user, roles, token, refreshToken };
}

/**
 * Renueva el par de tokens usando un refresh token válido.
 *
 * Flujo:
 * 1. Verifica la firma JWT del refresh token.
 * 2. Busca el usuario y compara el token con el hash en DB.
 * 3. Genera un nuevo par de tokens (rotación de refresh token).
 * 4. Almacena el nuevo refresh token hasheado en DB.
 *
 * @param {string} refreshTokenValue - Refresh token JWT del cliente.
 * @returns {Promise<{ token: string, refreshToken: string }>}
 * @throws {AppError} 401 si el refresh token es inválido o expirado.
 */
async function refresh(refreshTokenValue) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshTokenValue);
  } catch {
    throw new AppError('Refresh token inválido o expirado', 401);
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || !user.refreshToken) {
    throw new AppError('Refresh token inválido', 401);
  }

  const isValid = await bcrypt.compare(refreshTokenValue, user.refreshToken);
  if (!isValid) {
    throw new AppError('Refresh token inválido', 401);
  }

  const token = generateAccessToken({ id: user._id });
  const newRefreshToken = generateRefreshToken({ id: user._id });

  user.refreshToken = await bcrypt.hash(newRefreshToken, 10);
  await user.save();

  return { token, refreshToken: newRefreshToken };
}

/**
 * Cierra la sesión del usuario eliminando su refresh token de la DB.
 * El access token sigue válido hasta que expire, pero no podrá renovarse.
 *
 * @param {string} userId - ID del usuario que cierra sesión.
 */
async function logout(userId) {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
}

module.exports = { register, login, refresh, logout };
