const { Router } = require('express');
const movementController = require('../controllers/movement.controller');
const { createMovementValidation } = require('../validations/movement.validation');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', authenticate, authorize('movements:read'), movementController.getAll);
router.post('/', authenticate, authorize('movements:create'), createMovementValidation, validate, movementController.create);

module.exports = router;
