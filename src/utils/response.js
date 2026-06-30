/**
 * @fileoverview Helpers para enviar respuestas HTTP con formato unificado.
 *
 * Responsabilidad:
 * Garantiza que TODAS las respuestas exitosas del API sigan el mismo formato:
 * { success: true, message: '...', data: ... }
 *
 * Uso en controllers:
 *   sendSuccess(res, products);                              → 200, message 'OK'
 *   sendSuccess(res, product, 201, 'Producto creado');       → 201 con mensaje custom
 *   sendSuccess(res, null, 200, 'Sesión cerrada');           → sin data
 */

/**
 * Envía una respuesta exitosa con formato consistente.
 *
 * @param {import('express').Response} res - Objeto response de Express.
 * @param {*} data - Datos a enviar al cliente (objeto, array, o null).
 * @param {number} [statusCode=200] - Código HTTP de la respuesta.
 * @param {string} [message='OK'] - Mensaje descriptivo para el cliente.
 */
function sendSuccess(res, data, statusCode = 200, message = 'OK') {
  res.status(statusCode).json({ success: true, message, data });
}

/**
 * Envía una respuesta de error con formato consistente.
 * Nota: normalmente los errores se manejan vía AppError + errorHandler.
 * Este helper es para casos excepcionales donde se necesita responder
 * un error directamente sin lanzar una excepción.
 *
 * @param {import('express').Response} res - Objeto response de Express.
 * @param {string} message - Mensaje de error para el cliente.
 * @param {number} [statusCode=500] - Código HTTP del error.
 */
function sendError(res, message, statusCode = 500) {
  res.status(statusCode).json({ success: false, message });
}

module.exports = { sendSuccess, sendError };
