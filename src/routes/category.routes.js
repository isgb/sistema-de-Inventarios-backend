/**
 * @fileoverview Rutas de gestión de categorías.
 *
 * Base: /api/categories
 *
 * Permisos RBAC:
 * - GET  /    → categories:read (todos los roles autenticados)
 * - POST /    → categories:create (ADMIN+)
 * - PUT  /:id → categories:update (ADMIN+)
 */

const { Router } = require('express');
const categoryController = require('../controllers/category.controller');
const { updateCategoryValidation } = require('../validations/category.validation');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', authenticate, authorize('categories:read'), categoryController.getAll);
router.post('/', authenticate, authorize('categories:create'), categoryController.create);
router.put('/:id', authenticate, authorize('categories:update'), updateCategoryValidation, validate, categoryController.update);

module.exports = router;
