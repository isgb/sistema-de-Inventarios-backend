/**
 * @fileoverview Reglas de validación para endpoints de productos.
 *
 * createProductValidation:
 * - name: requerido, max 200.
 * - sku: requerido (unicidad se valida en Mongoose).
 * - category: requerido, debe ser un ObjectId válido de MongoDB.
 *   El service valida que la categoría exista y esté activa.
 * - price: requerido, >= 0.
 * - stock, minStock: opcionales, enteros >= 0.
 * - description: opcional, max 1000.
 *
 * updateProductValidation:
 * - Todos los campos son opcionales (actualización parcial).
 * - El :id en params se valida como ObjectId.
 *
 * idParamValidation:
 * - Valida que :id en params sea un ObjectId válido.
 *   Previene queries a MongoDB con IDs malformados.
 */

const { body, param } = require('express-validator');
const mongoose = require('mongoose');

const createProductValidation = [
  body('name')
    .trim().notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 200 }).withMessage('Máximo 200 caracteres'),
  body('sku')
    .trim().notEmpty().withMessage('El SKU es obligatorio'),
  body('category')
    .notEmpty().withMessage('La categoría es obligatoria')
    .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('ID de categoría no válido'),
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
  param('id').custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('ID no válido'),
  body('name').optional().trim().isLength({ max: 200 }).withMessage('Máximo 200 caracteres'),
  body('sku').optional().trim(),
  body('category')
    .optional()
    .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('ID de categoría no válido'),
  body('price').optional().isFloat({ min: 0 }).withMessage('El precio debe ser >= 0'),
  body('stock').optional().isInt({ min: 0 }).withMessage('El stock debe ser >= 0'),
  body('minStock').optional().isInt({ min: 0 }).withMessage('El stock mínimo debe ser >= 0'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Máximo 1000 caracteres'),
];

const idParamValidation = [
  param('id').custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('ID no válido'),
];

module.exports = { createProductValidation, updateProductValidation, idParamValidation };
