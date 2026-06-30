/**
 * @fileoverview Rutas de gestión de roles y permisos RBAC.
 *
 * Base: /api/roles
 *
 * Permisos RBAC:
 * - GET  /                    → roles:read (ADMIN+)
 * - GET  /permissions         → roles:read (ADMIN+)
 * - GET  /:roleId/permissions → roles:read (ADMIN+)
 * - POST /assign              → users:assign-role (solo SUPER_ADMIN)
 * - POST /revoke              → users:assign-role (solo SUPER_ADMIN)
 *
 * Seguridad:
 * - Asignar/revocar requiere users:assign-role (solo SUPER_ADMIN lo tiene por defecto).
 * - Además, al asignar se valida elevación de privilegios en el service:
 *   el asignador debe tener TODOS los permisos del rol que asigna.
 */

const { Router } = require('express');
const roleController = require('../controllers/role.controller');
const { assignRoleValidation, revokeRoleValidation, roleIdParamValidation } = require('../validations/role.validation');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', authenticate, authorize('roles:read'), roleController.getAllRoles);
router.get('/permissions', authenticate, authorize('roles:read'), roleController.getAllPermissions);
router.get('/:roleId/permissions', authenticate, authorize('roles:read'), roleIdParamValidation, validate, roleController.getRolePermissions);
router.post('/assign', authenticate, authorize('users:assign-role'), assignRoleValidation, validate, roleController.assignRole);
router.post('/revoke', authenticate, authorize('users:assign-role'), revokeRoleValidation, validate, roleController.revokeRole);

module.exports = router;
