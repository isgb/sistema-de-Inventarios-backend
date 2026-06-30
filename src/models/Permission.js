/**
 * @fileoverview Modelo de permiso para el sistema RBAC.
 *
 * Responsabilidad:
 * Define las acciones permitidas sobre cada recurso del sistema.
 * Formato: resource + action → 'products:create', 'users:assign-role'.
 * Los permisos se crean vía seed, no desde la API.
 *
 * Relaciones:
 * - Permission <-- RolePermission --> Role (qué roles tienen este permiso)
 *
 * Índice compuesto:
 * - { resource, action } es único. No pueden existir dos permisos
 *   con la misma combinación recurso + acción.
 */

const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  resource: {
    type: String,
    required: [true, 'El recurso es obligatorio'],
    lowercase: true,
    trim: true,
  },
  action: {
    type: String,
    required: [true, 'La acción es obligatoria'],
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'La descripción no puede exceder 200 caracteres'],
    default: '',
  },
}, {
  timestamps: true,
});

permissionSchema.index({ resource: 1, action: 1 }, { unique: true });

permissionSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Permission', permissionSchema);
