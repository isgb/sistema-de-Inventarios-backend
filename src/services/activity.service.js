/**
 * @fileoverview Servicio de registro de actividad compartida.
 *
 * Responsabilidad:
 * Registra y consulta eventos de actividad del sistema. Otros services
 * (product, category, movement, user, role) llaman a log() después de
 * una operación exitosa para dejar trazabilidad visible en el dashboard.
 */

const ActivityLog = require('../models/ActivityLog');

/**
 * Registra un evento de actividad. No lanza error si falla el registro
 * para no interrumpir la operación principal que lo originó.
 *
 * @param {string} userId - Usuario que realizó la acción.
 * @param {string} action - Descripción legible del evento.
 * @param {'create'|'update'|'delete'|'warning'|'info'} [type='info']
 */
async function log(userId, action, type = 'info') {
  try {
    await ActivityLog.create({ user: userId, action, type });
  } catch (error) {
    console.error('No se pudo registrar actividad:', error.message);
  }
}

/**
 * Obtiene los eventos de actividad más recientes con el nombre de quien los realizó.
 *
 * @param {number} [limit=20]
 * @returns {Promise<ActivityLog[]>}
 */
async function getRecent(limit = 20) {
  return ActivityLog.find()
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .limit(limit);
}

module.exports = { log, getRecent };
