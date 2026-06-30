/**
 * @fileoverview Modelo de asignación rol-permiso (tabla pivote N:N).
 *
 * Responsabilidad:
 * Vincula un rol con un permiso. Define qué acciones puede realizar
 * cada rol en el sistema.
 *
 * Relaciones:
 * - RolePermission.role --> Role
 * - RolePermission.permission --> Permission
 *
 * Índice compuesto:
 * - { role, permission } es único. Un rol no puede tener el mismo permiso dos veces.
 *
 * Uso en autorización:
 * authorize.js → permission.service.js consulta esta colección
 * para obtener los permisos efectivos de un usuario a través de sus roles.
 */

const mongoose = require('mongoose');

const rolePermissionSchema = new mongoose.Schema({
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'El rol es obligatorio'],
  },
  permission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
    required: [true, 'El permiso es obligatorio'],
  },
}, {
  timestamps: true,
});

rolePermissionSchema.index({ role: 1, permission: 1 }, { unique: true });
rolePermissionSchema.index({ role: 1 });

rolePermissionSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('RolePermission', rolePermissionSchema);
