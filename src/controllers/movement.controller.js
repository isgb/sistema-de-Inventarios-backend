/**
 * @fileoverview Controller de movimientos de inventario.
 *
 * Endpoints:
 * - GET /api/movements → getAll()
 *   Permiso: movements:read
 *   Salida: lista de movimientos con producto y usuario populados
 *
 * - POST /api/movements → create()
 *   Permiso: movements:create
 *   Entrada: { product (ObjectId), type (IN|OUT|ADJUSTMENT), quantity, reason? }
 *   Salida: movimiento creado (incluye previousStock y newStock)
 *   Nota: actualiza automáticamente el stock del producto vía transacción.
 */

const movementService = require('../services/movement.service');
const { sendSuccess } = require('../utils/response');

async function getAll(req, res, next) {
  try {
    const result = await movementService.getAll(req.query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const movement = await movementService.create(req.body, req.user._id);
    sendSuccess(res, movement, 201, 'Movimiento registrado exitosamente');
  } catch (error) {
    next(error);
  }
}

module.exports = { getAll, create };
