/**
 * @fileoverview Reglas de validación para endpoints de usuarios.
 *
 * createUserValidation: campos obligatorios para crear usuario.
 * updateUserValidation: campos opcionales para actualizar usuario.
 * - Si se envía password, debe tener mínimo 6 caracteres.
 * - Si se envía status, debe ser uno de: active, inactive, blocked.
 * - El ID en params se valida como ObjectId.
 */

const { body, param } = require('express-validator');
const mongoose = require('mongoose');

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
  body('roleName')
    .optional()
    .trim()
    .isString().withMessage('El nombre del rol debe ser texto'),
];

const updateUserValidation = [
  param('id')
    .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('ID de usuario no válido'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('El nombre debe tener entre 1 y 100 caracteres'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Email no válido')
    .normalizeEmail(),
  body('password')
    .optional()
    .isLength({ min: 6 }).withMessage('La contraseña debe tener mínimo 6 caracteres'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'blocked']).withMessage('Estado debe ser active, inactive o blocked'),
];

module.exports = { createUserValidation, updateUserValidation };
