const { Router } = require('express');
const userController = require('../controllers/user.controller');
const { createUserValidation } = require('../validations/user.validation');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', authenticate, authorize('users:read'), userController.getAll);
router.post('/', authenticate, authorize('users:create'), createUserValidation, validate, userController.create);

module.exports = router;
