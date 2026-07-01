/**
 * @fileoverview Modelo de producto del inventario.
 *
 * Responsabilidad:
 * Representa un artículo del inventario con su stock, precio y categoría.
 *
 * Relaciones:
 * - Product.category --> Category (ObjectId, no string. Permite populate y renombrado sin inconsistencias)
 * - Product.createdBy --> User (quién registró el producto)
 * - Product <-- InventoryMovement.product (movimientos que afectan su stock)
 *
 * Reglas de negocio:
 * - El stock nunca puede ser negativo (min: 0).
 * - minStock define el umbral de alerta de stock bajo.
 * - El stock se actualiza vía movimientos de inventario, no directamente.
 */

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del producto es obligatorio'],
    trim: true,
    maxlength: [200, 'El nombre no puede exceder 200 caracteres'],
  },
  sku: {
    type: String,
    required: [true, 'El SKU es obligatorio'],
    unique: true,
    uppercase: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'La descripción no puede exceder 1000 caracteres'],
    default: '',
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'La categoría es obligatoria'],
  },
  stock: {
    type: Number,
    required: true,
    min: [0, 'El stock no puede ser negativo'],
    default: 0,
  },
  minStock: {
    type: Number,
    min: [0, 'El stock mínimo no puede ser negativo'],
    default: 0,
  },
  price: {
    type: Number,
    required: [true, 'El precio es obligatorio'],
    min: [0, 'El precio no puede ser negativo'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isSeed: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

productSchema.index({ category: 1 });
productSchema.index({ createdBy: 1 });
productSchema.index({ stock: 1, minStock: 1 });

productSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Product', productSchema);
