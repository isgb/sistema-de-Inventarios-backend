/**
 * @fileoverview Rutas de actividad reciente del sistema.
 *
 * Base: /api/activity
 *
 * Permisos RBAC:
 * - GET / → activity:read (todos los roles autenticados)
 */

const { Router } = require('express');
const activityController = require('../controllers/activity.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', authenticate, authorize('activity:read'), activityController.getAll);

module.exports = router;
