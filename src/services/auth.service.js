const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const bcrypt = require('bcrypt');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000;

async function register({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('Este correo ya está registrado', 409);
  }

  const user = await User.create({ name, email, password });
  const token = generateAccessToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id });

  user.refreshToken = await bcrypt.hash(refreshToken, 10);
  await user.save();

  return { user, token, refreshToken };
}

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

  const token = generateAccessToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id });

  user.refreshToken = await bcrypt.hash(refreshToken, 10);
  await user.save();

  return { user, token, refreshToken };
}

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

  const token = generateAccessToken({ id: user._id, role: user.role });
  const newRefreshToken = generateRefreshToken({ id: user._id });

  user.refreshToken = await bcrypt.hash(newRefreshToken, 10);
  await user.save();

  return { token, refreshToken: newRefreshToken };
}

async function logout(userId) {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
}

module.exports = { register, login, refresh, logout };
