/**
 * @fileoverview Middleware de autorización RBAC desde base de datos.
 *
 * Responsabilidad:
 * Verifica que el usuario autenticado tenga los permisos necesarios
 * para acceder al endpoint. Los permisos se consultan desde MongoDB
 * a través de permission.service.js (con cache de 5 minutos).
 *
 * Flujo de autorización:
 * 1. Recibe los permisos requeridos como parámetros (e.g. 'products:create').
 * 2. Obtiene los permisos efectivos del usuario (consolidados de todos sus roles).
 * 3. Verifica que el usuario tenga TODOS los permisos requeridos.
 * 4. Si los tiene → next(). Si no → AppError 403.
 *
 * Uso en rutas:
 *   router.post('/', authenticate, authorize('products:create'), controller.create);
 *   router.put('/:id', authenticate, authorize('users:update', 'users:assign-role'), ...);
 *
 * @param {...string} requiredPermissions - Permisos necesarios en formato 'recurso:accion'.
 * @returns {Function} Middleware async de Express.
 */

const { getEffectivePermissions } = require('../services/permission.service');
const AppError = require('../utils/AppError');

function authorize(...requiredPermissions) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError('No autenticado', 401));
      }

      const userPermissions = await getEffectivePermissions(req.user._id);
      const hasPermission = requiredPermissions.every(perm => userPermissions.includes(perm));

      if (!hasPermission) {
        return next(new AppError('No tienes permisos para esta acción', 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = authorize;
