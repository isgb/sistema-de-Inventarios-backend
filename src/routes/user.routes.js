/**
 * @fileoverview Rutas de gestión de usuarios.
 *
 * Base: /api/users
 *
 * Permisos RBAC:
 * - GET  /     → users:read (ADMIN, SUPER_ADMIN)
 * - GET  /:id  → users:read (ADMIN, SUPER_ADMIN)
 * - POST /     → users:create (ADMIN, SUPER_ADMIN)
 * - PUT  /:id  → users:update (ADMIN, SUPER_ADMIN)
 */

const { Router } = require('express');
const userController = require('../controllers/user.controller');
const { createUserValidation, updateUserValidation } = require('../validations/user.validation');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', authenticate, authorize('users:read'), userController.getAll);
router.get('/:id', authenticate, authorize('users:read'), userController.getById);
router.post('/', authenticate, authorize('users:create'), createUserValidation, validate, userController.create);
router.put('/:id', authenticate, authorize('users:update'), updateUserValidation, validate, userController.update);

module.exports = router;
