/**
 * @fileoverview Servicio de gestión de roles y asignación RBAC.
 *
 * Responsabilidad:
 * Listar roles y permisos, asignar y revocar roles a usuarios.
 * Implementa protección contra elevación de privilegios: un usuario
 * solo puede asignar roles cuyos permisos son un subconjunto de los suyos.
 */

const Role = require('../models/Role');
const Permission = require('../models/Permission');
const UserRole = require('../models/UserRole');
const RolePermission = require('../models/RolePermission');
const User = require('../models/User');
const { getEffectivePermissions, invalidateCache } = require('./permission.service');
const AppError = require('../utils/AppError');
const activityService = require('./activity.service');

/**
 * Obtiene todos los roles activos del sistema.
 *
 * @returns {Promise<Role[]>} Roles ordenados alfabéticamente.
 */
async function getAllRoles() {
  return Role.find({ active: true }).sort({ name: 1 });
}

/**
 * Obtiene todos los permisos registrados en el sistema.
 *
 * @returns {Promise<Permission[]>} Permisos ordenados por recurso y acción.
 */
async function getAllPermissions() {
  return Permission.find().sort({ resource: 1, action: 1 });
}

/**
 * Obtiene los permisos asignados a un rol específico.
 *
 * @param {string} roleId - ObjectId del rol.
 * @returns {Promise<Permission[]>} Permisos del rol.
 */
async function getRolePermissions(roleId) {
  const mappings = await RolePermission.find({ role: roleId }).populate('permission');
  return mappings.map(mapping => mapping.permission);
}

/**
 * Asigna un rol a un usuario con protección contra elevación de privilegios.
 *
 * Flujo:
 * 1. Valida que el rol existe y está activo.
 * 2. Llama a canAssignRole para verificar que el asignador tiene
 *    todos los permisos del rol que quiere asignar.
 * 3. Verifica que el usuario no tenga ya ese rol.
 * 4. Crea el registro UserRole con referencia al asignador (auditoría).
 * 5. Invalida el cache de permisos del usuario afectado.
 *
 * @param {string} userId - Usuario que recibe el rol.
 * @param {string} roleId - Rol a asignar.
 * @param {string} assignerId - Usuario que realiza la asignación.
 * @returns {Promise<UserRole>} Registro de asignación creado.
 * @throws {AppError} 404 rol no encontrado, 403 elevación de privilegios, 409 rol duplicado.
 */
async function assignRoleToUser(userId, roleId, assignerId) {
  const role = await Role.findById(roleId);
  if (!role || !role.active) {
    throw new AppError('Rol no encontrado o inactivo', 404);
  }

  const canAssign = await canAssignRole(assignerId, roleId);
  if (!canAssign) {
    throw new AppError('No puedes asignar un rol con permisos que no tienes', 403);
  }

  const existing = await UserRole.findOne({ user: userId, role: roleId });
  if (existing) {
    throw new AppError('El usuario ya tiene este rol asignado', 409);
  }

  const userRole = await UserRole.create({
    user: userId,
    role: roleId,
    assignedBy: assignerId,
  });

  invalidateCache(userId);

  const targetUser = await User.findById(userId).select('name email');
  await activityService.log(
    assignerId,
    `Rol ${role.name} asignado a ${targetUser?.name || targetUser?.email || 'usuario'}`,
    'update',
  );

  return userRole;
}

/**
 * Revoca un rol de un usuario e invalida su cache de permisos.
 *
 * @param {string} userId - Usuario al que se le quita el rol.
 * @param {string} roleId - Rol a revocar.
 * @param {string} actorId - Usuario que realiza la revocación.
 * @throws {AppError} 404 si el usuario no tiene ese rol.
 */
async function revokeRoleFromUser(userId, roleId, actorId) {
  const result = await UserRole.findOneAndDelete({ user: userId, role: roleId });
  if (!result) {
    throw new AppError('El usuario no tiene este rol asignado', 404);
  }
  invalidateCache(userId);

  const [role, targetUser] = await Promise.all([
    Role.findById(roleId).select('name'),
    User.findById(userId).select('name email'),
  ]);
  await activityService.log(
    actorId,
    `Rol ${role?.name || ''} revocado a ${targetUser?.name || targetUser?.email || 'usuario'}`,
    'update',
  );
}

/**
 * Verifica si un usuario puede asignar un rol determinado.
 *
 * Compara los permisos efectivos del asignador contra los permisos del rol objetivo.
 * El asignador debe tener TODOS los permisos que contiene el rol.
 *
 * Ejemplo:
 * - ADMIN tiene [products:*, categories:*, users:read, users:create]
 * - Quiere asignar MANAGER que tiene [products:read, movements:*]
 * - ADMIN tiene products:read pero NO movements:create → rechazado
 *
 * @param {string} assignerId - ID del usuario que asigna.
 * @param {string} targetRoleId - ID del rol a asignar.
 * @returns {Promise<boolean>} true si puede asignar, false si no.
 */
async function canAssignRole(assignerId, targetRoleId) {
  const assignerPermissions = await getEffectivePermissions(assignerId);

  const targetRolePermissions = await RolePermission.find({ role: targetRoleId })
    .populate('permission');

  const targetPermissionStrings = targetRolePermissions.map(mapping => {
    return `${mapping.permission.resource}:${mapping.permission.action}`;
  });

  return targetPermissionStrings.every(perm => assignerPermissions.includes(perm));
}

module.exports = {
  getAllRoles,
  getAllPermissions,
  getRolePermissions,
  assignRoleToUser,
  revokeRoleFromUser,
};
