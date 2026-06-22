const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  USER: 'USER',
};

const ROLE_HIERARCHY = [ROLES.USER, ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN];

const PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ['users:read', 'users:create', 'users:update', 'users:delete', 'users:assign-role',
    'products:read', 'products:create', 'products:update', 'products:delete',
    'categories:read', 'categories:create', 'categories:update',
    'movements:read', 'movements:create'],
  [ROLES.ADMIN]: ['users:read', 'users:create',
    'products:read', 'products:create', 'products:update', 'products:delete',
    'categories:read', 'categories:create', 'categories:update',
    'movements:read', 'movements:create'],
  [ROLES.MANAGER]: ['products:read',
    'categories:read',
    'movements:read', 'movements:create'],
  [ROLES.USER]: ['products:read', 'categories:read', 'movements:read'],
};

/**
 * Verifica si un rol puede asignar otro rol (impide elevación de privilegios).
 * @param {string} assignerRole
 * @param {string} targetRole
 * @returns {boolean}
 */
function canAssignRole(assignerRole, targetRole) {
  const assignerLevel = ROLE_HIERARCHY.indexOf(assignerRole);
  const targetLevel = ROLE_HIERARCHY.indexOf(targetRole);
  return assignerLevel > targetLevel;
}

module.exports = { ROLES, ROLE_HIERARCHY, PERMISSIONS, canAssignRole };
