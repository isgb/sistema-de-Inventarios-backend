/**
 * @fileoverview Middleware centralizado de manejo de errores.
 *
 * Responsabilidad:
 * Atrapa todos los errores no manejados y los convierte en respuestas
 * JSON consistentes. Es el ÚLTIMO middleware registrado en app.js.
 *
 * Tipos de error que maneja:
 * - AppError (errores operacionales): usa su statusCode y message directamente.
 * - CastError (Mongoose): ID de MongoDB con formato inválido → 400.
 * - code 11000 (Mongoose): violación de campo unique → 409.
 * - ValidationError (Mongoose): validación de schema fallida → 400.
 * - MulterError (carga de archivos): archivo inválido o demasiado grande → 400.
 * - Cualquier otro error: se trata como error interno → 500.
 *
 * Seguridad:
 * - En producción NUNCA expone stack traces al cliente.
 * - En desarrollo incluye stack trace solo para errores no operacionales
 *   (bugs, no errores esperados del negocio).
 */

const AppError = require('../utils/AppError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'ID no válido';
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `Ya existe un registro con ese ${field}`;
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    const messages = Object.values(err.errors).map(e => e.message);
    message = messages.join('. ');
  }

  if (err.name === 'MulterError') {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera el límite de 3MB' : 'Error al procesar el archivo';
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && !err.isOperational && { stack: err.stack }),
  });
}

module.exports = errorHandler;
