/**
 * @fileoverview Controller de actividad reciente del sistema.
 *
 * Endpoints:
 * - GET /api/activity → getAll()
 *   Permiso: activity:read
 *   Salida: últimos 20 eventos de actividad compartidos por todos los usuarios
 */

const activityService = require('../services/activity.service');
const { sendSuccess } = require('../utils/response');

async function getAll(req, res, next) {
  try {
    const activity = await activityService.getRecent();
    sendSuccess(res, activity);
  } catch (error) {
    next(error);
  }
}

module.exports = { getAll };
