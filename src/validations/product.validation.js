const { body, param } = require('express-validator');
const mongoose = require('mongoose');

const createProductValidation = [
  body('name')
    .trim().notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 200 }).withMessage('Máximo 200 caracteres'),
  body('sku')
    .trim().notEmpty().withMessage('El SKU es obligatorio'),
  body('category')
    .trim().notEmpty().withMessage('La categoría es obligatoria'),
  body('price')
    .notEmpty().withMessage('El precio es obligatorio')
    .isFloat({ min: 0 }).withMessage('El precio debe ser >= 0'),
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('El stock debe ser >= 0'),
  body('minStock')
    .optional()
    .isInt({ min: 0 }).withMessage('El stock mínimo debe ser >= 0'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Máximo 1000 caracteres'),
];

const updateProductValidation = [
  param('id').custom(v => mongoose.Types.ObjectId.isValid(v)).withMessage('ID no válido'),
  body('name').optional().trim().isLength({ max: 200 }).withMessage('Máximo 200 caracteres'),
  body('sku').optional().trim(),
  body('category').optional().trim(),
  body('price').optional().isFloat({ min: 0 }).withMessage('El precio debe ser >= 0'),
  body('stock').optional().isInt({ min: 0 }).withMessage('El stock debe ser >= 0'),
  body('minStock').optional().isInt({ min: 0 }).withMessage('El stock mínimo debe ser >= 0'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Máximo 1000 caracteres'),
];

const idParamValidation = [
  param('id').custom(v => mongoose.Types.ObjectId.isValid(v)).withMessage('ID no válido'),
];

module.exports = { createProductValidation, updateProductValidation, idParamValidation };
