const { Router } = require('express');
const categoryController = require('../controllers/category.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', authenticate, authorize('categories:read'), categoryController.getAll);
router.post('/', authenticate, authorize('categories:create'), categoryController.create);

module.exports = router;
