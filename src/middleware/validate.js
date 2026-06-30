/**
 * @fileoverview Middleware que ejecuta las reglas de express-validator.
 *
 * Responsabilidad:
 * Se coloca DESPUÉS de los arrays de validación y ANTES del controller.
 * Recopila todos los errores de validación y retorna 400 si hay alguno.
 *
 * Uso en rutas:
 *   router.post('/', createProductValidation, validate, controller.create);
 *                     ^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^
 *                     reglas de validación       este middleware
 */

const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map(e => e.msg).join('. ');
    return res.status(400).json({ success: false, message });
  }
  next();
}

module.exports = validate;
