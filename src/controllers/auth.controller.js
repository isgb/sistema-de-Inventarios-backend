/**
 * @fileoverview Controller de autenticación.
 *
 * Responsabilidad:
 * Maneja las peticiones HTTP de registro, login, refresh y logout.
 * Delega toda la lógica al auth.service.js.
 *
 * Endpoints:
 * - POST /api/auth/register → register()
 *   Entrada: { name, email, password }
 *   Salida: { user, roles, token, refreshToken }
 *
 * - POST /api/auth/login → login()
 *   Entrada: { email, password }
 *   Salida: { user, roles, token, refreshToken }
 *
 * - POST /api/auth/refresh → refresh()
 *   Entrada: { refreshToken }
 *   Salida: { token, refreshToken }
 *
 * - POST /api/auth/logout → logout() (requiere autenticación)
 *   Entrada: token en header Authorization
 *   Salida: null
 */

const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/response');

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    sendSuccess(res, result, 201, 'Usuario registrado exitosamente');
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    sendSuccess(res, result, 200, 'Login exitoso');
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const result = await authService.refresh(req.body.refreshToken);
    sendSuccess(res, result, 200, 'Token renovado');
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.user._id);
    sendSuccess(res, null, 200, 'Sesión cerrada');
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, refresh, logout };
