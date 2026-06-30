/**
 * @fileoverview Clase de error personalizada para errores operacionales.
 *
 * Responsabilidad:
 * Representa errores esperados del negocio (no encontrado, sin permisos, duplicado, etc.)
 * que deben retornar un código HTTP específico al cliente.
 *
 * Diferencia con Error nativo:
 * - Incluye statusCode para que errorHandler sepa qué HTTP retornar.
 * - isOperational = true indica que es un error controlado, no un bug.
 *   errorHandler usa esto para decidir si mostrar stack trace en desarrollo.
 *
 * Uso en services:
 *   throw new AppError('Producto no encontrado', 404);
 *   throw new AppError('Stock insuficiente. Disponible: 5', 400);
 *   throw new AppError('No tienes permisos para esta acción', 403);
 */

class AppError extends Error {
  /**
   * @param {string} message - Mensaje descriptivo para el cliente.
   * @param {number} statusCode - Código HTTP (400, 401, 403, 404, 409, etc.).
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
