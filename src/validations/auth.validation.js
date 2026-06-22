const { body } = require('express-validator');

const registerValidation = [
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
];

const loginValidation = [
  body('email')
    .trim().notEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('Email no válido')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria'),
];

const refreshValidation = [
  body('refreshToken')
    .notEmpty().withMessage('El refresh token es obligatorio'),
];

module.exports = { registerValidation, loginValidation, refreshValidation };
