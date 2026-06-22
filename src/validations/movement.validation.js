const { body } = require('express-validator');
const mongoose = require('mongoose');

const createMovementValidation = [
  body('product')
    .notEmpty().withMessage('El producto es obligatorio')
    .custom(v => mongoose.Types.ObjectId.isValid(v)).withMessage('ID de producto no válido'),
  body('type')
    .notEmpty().withMessage('El tipo es obligatorio')
    .isIn(['IN', 'OUT', 'ADJUSTMENT']).withMessage('Tipo debe ser IN, OUT o ADJUSTMENT'),
  body('quantity')
    .notEmpty().withMessage('La cantidad es obligatoria')
    .isInt({ min: 1 }).withMessage('La cantidad debe ser al menos 1'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Máximo 500 caracteres'),
];

module.exports = { createMovementValidation };
