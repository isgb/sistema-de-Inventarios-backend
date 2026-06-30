/**
 * @fileoverview Modelo de asignación usuario-rol (tabla pivote N:N).
 *
 * Responsabilidad:
 * Vincula un usuario con un rol. Un usuario puede tener múltiples roles,
 * y un rol puede estar asignado a múltiples usuarios.
 *
 * Relaciones:
 * - UserRole.user --> User
 * - UserRole.role --> Role
 * - UserRole.assignedBy --> User (quién hizo la asignación, para auditoría)
 *
 * Índice compuesto:
 * - { user, role } es único. Un usuario no puede tener el mismo rol dos veces.
 *
 * Reglas de negocio:
 * - Al crear o eliminar un UserRole se debe invalidar el cache de
 *   permisos del usuario afectado (ver permission.service.js).
 */

const mongoose = require('mongoose');

const userRoleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario es obligatorio'],
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'El rol es obligatorio'],
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

userRoleSchema.index({ user: 1, role: 1 }, { unique: true });
userRoleSchema.index({ user: 1 });

userRoleSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('UserRole', userRoleSchema);
