const { body } = require('express-validator');
const { ROLES } = require('../config/roles');

const createUserValidation = [
  body('name')
    .trim().notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 100 }).withMessage('Máximo 100 caracteres'),
  body('email')
    .trim().notEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('Email no válido')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria')
    .isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
  body('role')
    .optional()
    .isIn(Object.values(ROLES)).withMessage('Rol no válido'),
];

module.exports = { createUserValidation };
