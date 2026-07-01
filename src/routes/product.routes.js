/**
 * @fileoverview Rutas de gestión de productos.
 *
 * Base: /api/products
 *
 * Nota: las rutas /stats, /export y /import/* van ANTES de /:id para que
 * Express no interprete esos segmentos como un parámetro :id.
 *
 * Permisos RBAC:
 * - Lectura (GET): products:read (todos los roles autenticados)
 * - Escritura (POST, PUT, DELETE): products:create/update/delete (ADMIN+)
 * - Importar/exportar Excel: mismos permisos que crear/leer productos
 */

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const productController = require('../controllers/product.controller');
const { createProductValidation, updateProductValidation, idParamValidation } = require('../validations/product.validation');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const uploadExcel = require('../middleware/upload');

const router = Router();

/** Rate limiter para crear productos: 20 por minuto por IP */
const createProductLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'Demasiados productos creados. Intenta en un minuto' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Rate limiter para importar Excel: 2 por minuto por IP */
const importLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2,
  message: { success: false, message: 'Límite de importaciones alcanzado. Intenta en un minuto' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/stats', authenticate, authorize('products:read'), productController.getStats);
router.get('/export', authenticate, authorize('products:read'), productController.exportAll);
router.post('/import/preview', importLimiter, authenticate, authorize('products:create'), uploadExcel.single('file'), productController.previewImport);
router.post('/import/confirm', importLimiter, authenticate, authorize('products:create'), productController.confirmImport);
router.get('/', authenticate, authorize('products:read'), productController.getAll);
router.get('/:id', authenticate, authorize('products:read'), idParamValidation, validate, productController.getById);
router.post('/', createProductLimiter, authenticate, authorize('products:create'), createProductValidation, validate, productController.create);
router.put('/:id', authenticate, authorize('products:update'), updateProductValidation, validate, productController.update);
router.delete('/:id', authenticate, authorize('products:delete'), idParamValidation, validate, productController.remove);

module.exports = router;
