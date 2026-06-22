const { PERMISSIONS } = require('../config/roles');
const AppError = require('../utils/AppError');

/**
 * Middleware de autorización basado en permisos.
 * @param {...string} requiredPermissions - Permisos necesarios (e.g. 'products:create').
 * @returns {Function} Middleware de Express
 */
function authorize(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('No autenticado', 401));
    }

    const userPermissions = PERMISSIONS[req.user.role] || [];
    const hasPermission = requiredPermissions.every(p => userPermissions.includes(p));

    if (!hasPermission) {
      return next(new AppError('No tienes permisos para esta acción', 403));
    }

    next();
  };
}

module.exports = authorize;
