/**
 * @fileoverview Servicio de consulta de permisos RBAC con cache en memoria.
 *
 * Responsabilidad:
 * Consulta los permisos efectivos de un usuario a través de la cadena
 * UserRole → RolePermission → Permission. Cachea los resultados en memoria
 * para evitar 3 queries a MongoDB en cada petición autenticada.
 *
 * Cache:
 * - Implementado con Map nativo de JavaScript (sin dependencias externas).
 * - TTL de 5 minutos por usuario.
 * - Se invalida manualmente al asignar o revocar un rol.
 *
 * Este servicio es consumido por:
 * - authorize.js (middleware): para verificar permisos en cada petición.
 * - auth.service.js: para incluir roles en la respuesta del login.
 * - user.service.js: para incluir roles al listar usuarios.
 * - role.service.js: para validar elevación de privilegios al asignar roles.
 */

const UserRole = require('../models/UserRole');
const RolePermission = require('../models/RolePermission');

/** Cache en memoria: Map<userId, { permissions: string[], expiresAt: number }> */
const cache = new Map();

/** Tiempo de vida del cache: 5 minutos en milisegundos */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Obtiene los permisos efectivos de un usuario (consolidados de todos sus roles).
 *
 * Flujo:
 * 1. Busca en cache por userId. Si hay entrada válida (TTL no expirado), la retorna.
 * 2. Si no hay cache: consulta UserRole para obtener los roleIds del usuario.
 * 3. Consulta RolePermission con populate('permission') para los roleIds.
 * 4. Extrae strings 'resource:action' de cada permiso.
 * 5. Deduplica (un usuario con ADMIN + MANAGER podría tener permisos repetidos).
 * 6. Guarda en cache y retorna.
 *
 * @param {string} userId - ObjectId del usuario.
 * @returns {Promise<string[]>} Array de permisos en formato 'resource:action'.
 */
async function getEffectivePermissions(userId) {
  const cacheKey = userId.toString();
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.permissions;
  }

  const userRoles = await UserRole.find({ user: userId });
  const roleIds = userRoles.map(userRole => userRole.role);

  if (roleIds.length === 0) {
    cache.set(cacheKey, { permissions: [], expiresAt: Date.now() + CACHE_TTL_MS });
    return [];
  }

  const rolePermissions = await RolePermission.find({ role: { $in: roleIds } })
    .populate('permission');

  const permissions = rolePermissions.map(rolePermission => {
    const permission = rolePermission.permission;
    return `${permission.resource}:${permission.action}`;
  });

  const uniquePermissions = [...new Set(permissions)];

  cache.set(cacheKey, {
    permissions: uniquePermissions,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return uniquePermissions;
}

/**
 * Obtiene los nombres de rol de un usuario (para incluir en respuestas de API).
 *
 * @param {string} userId - ObjectId del usuario.
 * @returns {Promise<string[]>} Nombres de rol, e.g. ['ADMIN', 'MANAGER'].
 */
async function getUserRoleNames(userId) {
  const userRoles = await UserRole.find({ user: userId }).populate('role', 'name');
  return userRoles.map(userRole => userRole.role.name);
}

/**
 * Invalida el cache de permisos de un usuario específico.
 * Debe llamarse siempre que se asigne o revoque un rol.
 *
 * @param {string} userId - ObjectId del usuario cuyo cache se invalida.
 */
function invalidateCache(userId) {
  cache.delete(userId.toString());
}

module.exports = { getEffectivePermissions, getUserRoleNames, invalidateCache };
