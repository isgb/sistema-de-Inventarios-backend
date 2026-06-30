/**
 * @fileoverview Reglas de validación para endpoints de roles RBAC.
 *
 * assignRoleValidation / revokeRoleValidation:
 * - userId: requerido, ObjectId válido de MongoDB.
 * - roleId: requerido, ObjectId válido de MongoDB.
 *   La validación de existencia del rol y del usuario,
 *   así como la protección contra elevación de privilegios,
 *   se maneja en role.service.js.
 *
 * roleIdParamValidation:
 * - Valida :roleId en params como ObjectId válido.
 */

const { body, param } = require('express-validator');
const mongoose = require('mongoose');

const assignRoleValidation = [
  body('userId')
    .notEmpty().withMessage('El ID del usuario es obligatorio')
    .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('ID de usuario no válido'),
  body('roleId')
    .notEmpty().withMessage('El ID del rol es obligatorio')
    .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('ID de rol no válido'),
];

const revokeRoleValidation = [
  body('userId')
    .notEmpty().withMessage('El ID del usuario es obligatorio')
    .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('ID de usuario no válido'),
  body('roleId')
    .notEmpty().withMessage('El ID del rol es obligatorio')
    .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('ID de rol no válido'),
];

const roleIdParamValidation = [
  param('roleId')
    .custom(value => mongoose.Types.ObjectId.isValid(value)).withMessage('ID de rol no válido'),
];

module.exports = { assignRoleValidation, revokeRoleValidation, roleIdParamValidation };
