const { Router } = require('express');
const productController = require('../controllers/product.controller');
const { createProductValidation, updateProductValidation, idParamValidation } = require('../validations/product.validation');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/stats', authenticate, authorize('products:read'), productController.getStats);
router.get('/', authenticate, authorize('products:read'), productController.getAll);
router.get('/:id', authenticate, authorize('products:read'), idParamValidation, validate, productController.getById);
router.post('/', authenticate, authorize('products:create'), createProductValidation, validate, productController.create);
router.put('/:id', authenticate, authorize('products:update'), updateProductValidation, validate, productController.update);
router.delete('/:id', authenticate, authorize('products:delete'), idParamValidation, validate, productController.remove);

module.exports = router;
