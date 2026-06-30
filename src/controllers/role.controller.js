/**
 * @fileoverview Controller de gestión de roles y permisos RBAC.
 *
 * Endpoints:
 * - GET /api/roles → getAllRoles()
 *   Permiso: roles:read
 *   Salida: lista de roles activos
 *
 * - GET /api/roles/permissions → getAllPermissions()
 *   Permiso: roles:read
 *   Salida: lista de todos los permisos del sistema
 *
 * - GET /api/roles/:roleId/permissions → getRolePermissions()
 *   Permiso: roles:read
 *   Salida: permisos asignados al rol indicado
 *
 * - POST /api/roles/assign → assignRole()
 *   Permiso: users:assign-role
 *   Entrada: { userId, roleId }
 *   Salida: registro UserRole creado
 *   Nota: valida elevación de privilegios vía canAssignRole.
 *
 * - POST /api/roles/revoke → revokeRole()
 *   Permiso: users:assign-role
 *   Entrada: { userId, roleId }
 *   Salida: null
 */

const roleService = require('../services/role.service');
const { sendSuccess } = require('../utils/response');

async function getAllRoles(req, res, next) {
  try {
    const roles = await roleService.getAllRoles();
    sendSuccess(res, roles);
  } catch (error) {
    next(error);
  }
}

async function getAllPermissions(req, res, next) {
  try {
    const permissions = await roleService.getAllPermissions();
    sendSuccess(res, permissions);
  } catch (error) {
    next(error);
  }
}

async function getRolePermissions(req, res, next) {
  try {
    const permissions = await roleService.getRolePermissions(req.params.roleId);
    sendSuccess(res, permissions);
  } catch (error) {
    next(error);
  }
}

async function assignRole(req, res, next) {
  try {
    const { userId, roleId } = req.body;
    const userRole = await roleService.assignRoleToUser(userId, roleId, req.user._id);
    sendSuccess(res, userRole, 201, 'Rol asignado exitosamente');
  } catch (error) {
    next(error);
  }
}

async function revokeRole(req, res, next) {
  try {
    const { userId, roleId } = req.body;
    await roleService.revokeRoleFromUser(userId, roleId, req.user._id);
    sendSuccess(res, null, 200, 'Rol revocado exitosamente');
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllRoles, getAllPermissions, getRolePermissions, assignRole, revokeRole };
