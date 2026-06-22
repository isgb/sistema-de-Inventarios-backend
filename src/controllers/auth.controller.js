const authService = require('../services/auth.service');

async function register(req, res, next) {
  try {
    const { user, token, refreshToken } = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user,
      token,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { user, token, refreshToken } = await authService.login(req.body);
    res.json({
      success: true,
      message: 'Login exitoso',
      user,
      token,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const { token, refreshToken } = await authService.refresh(req.body.refreshToken);
    res.json({ success: true, token, refreshToken });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.user._id);
    res.json({ success: true, message: 'Sesión cerrada' });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, refresh, logout };
