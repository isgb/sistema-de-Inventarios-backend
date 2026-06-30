/**
 * @fileoverview Reglas de validación para endpoints de categorías.
 *
 * updateCategoryValidation:
 * - :id en params debe ser un ObjectId válido.
 * - name: opcional, max 100 caracteres.
 * - active: opcional, booleano (activar/desactivar categoría).
 */

const { body, param } = require('express-validator');
const mongoose = require('mongoose');

const updateCategoryValidation = [
  param('id').custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('ID no válido'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('El nombre debe tener entre 1 y 100 caracteres'),
  body('active')
    .optional()
    .isBoolean().withMessage('active debe ser true o false'),
];

module.exports = { updateCategoryValidation };
