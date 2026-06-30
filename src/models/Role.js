/**
 * @fileoverview Modelo de rol para el sistema RBAC.
 *
 * Responsabilidad:
 * Define los roles disponibles en el sistema (SUPER_ADMIN, ADMIN, MANAGER, USER).
 * Los roles se crean vía seed, no desde la API.
 *
 * Relaciones:
 * - Role <-- UserRole --> User (qué usuarios tienen este rol)
 * - Role <-- RolePermission --> Permission (qué permisos tiene este rol)
 *
 * Reglas de negocio:
 * - El nombre es único y se almacena en mayúsculas.
 * - Soporta soft-delete vía campo active.
 * - Un rol inactivo no puede ser asignado a nuevos usuarios.
 */

const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del rol es obligatorio'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [50, 'El nombre no puede exceder 50 caracteres'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'La descripción no puede exceder 200 caracteres'],
    default: '',
  },
  active: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

roleSchema.index({ name: 1, active: 1 });

roleSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Role', roleSchema);
