/**
 * @fileoverview Modelo de registro de actividad del sistema.
 *
 * Responsabilidad:
 * Guarda un log compartido de acciones relevantes (crear/editar/eliminar productos,
 * categorías, movimientos, usuarios y roles) para mostrarlo en el dashboard.
 * Reemplaza el log anterior que vivía en localStorage del navegador.
 *
 * Relaciones:
 * - ActivityLog.user --> User (quién realizó la acción)
 */

const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
    trim: true,
    maxlength: [300, 'La acción no puede exceder 300 caracteres'],
  },
  type: {
    type: String,
    enum: ['create', 'update', 'delete', 'warning', 'info'],
    default: 'info',
  },
}, {
  timestamps: true,
});

activityLogSchema.index({ createdAt: -1 });

activityLogSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);
