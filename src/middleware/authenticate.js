/**
 * @fileoverview Middleware de autenticación JWT.
 *
 * Responsabilidad:
 * Verifica que la petición incluya un token JWT válido y adjunta
 * el usuario autenticado a req.user para uso en los siguientes middleware.
 *
 * Flujo:
 * 1. Extrae el token del header Authorization: Bearer <token>.
 * 2. Verifica la firma y expiración del JWT.
 * 3. Busca el usuario en DB (solo campos necesarios para optimizar la query).
 * 4. Verifica que la cuenta esté activa.
 * 5. Adjunta el usuario a req.user.
 *
 * Errores posibles:
 * - 401: token ausente, inválido, expirado, o usuario no encontrado.
 * - 403: cuenta desactivada o bloqueada.
 */

const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const AppError = require('../utils/AppError');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token de autenticación requerido', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id).select('_id name email status');
    if (!user) {
      throw new AppError('Usuario no encontrado', 401);
    }

    if (user.status !== 'active') {
      throw new AppError('Cuenta desactivada o bloqueada', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Token inválido', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expirado', 401));
    }
    next(error);
  }
}

module.exports = authenticate;
