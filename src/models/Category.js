/**
 * @fileoverview Modelo de categoría para agrupar productos.
 *
 * Responsabilidad:
 * Clasifica productos por tipo (Electrónica, Periféricos, etc.).
 * Soporta soft-delete vía campo active.
 *
 * Relaciones:
 * - Category <-- Product.category (productos que pertenecen a esta categoría)
 *
 * Reglas de negocio:
 * - El nombre es único (no pueden existir dos categorías con el mismo nombre).
 * - Solo se muestran categorías con active: true en los listados.
 */

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre de la categoría es obligatorio'],
    unique: true,
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
  },
  active: {
    type: Boolean,
    default: true,
  },
  isSeed: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

categorySchema.index({ name: 1, active: 1 });

categorySchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Category', categorySchema);
