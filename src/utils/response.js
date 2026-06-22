/**
 * Envía respuesta exitosa con formato consistente.
 * @param {import('express').Response} res
 * @param {*} data
 * @param {number} [statusCode=200]
 * @param {string} [message='OK']
 */
function sendSuccess(res, data, statusCode = 200, message = 'OK') {
  res.status(statusCode).json({ success: true, message, data });
}

/**
 * Envía respuesta de error con formato consistente.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} [statusCode=500]
 */
function sendError(res, message, statusCode = 500) {
  res.status(statusCode).json({ success: false, message });
}

module.exports = { sendSuccess, sendError };
