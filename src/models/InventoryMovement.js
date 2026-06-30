/**
 * @fileoverview Modelo de movimiento de inventario.
 *
 * Responsabilidad:
 * Registra cada cambio de stock en un producto. Funciona como log de auditoría.
 *
 * Relaciones:
 * - InventoryMovement.product --> Product (producto afectado)
 * - InventoryMovement.createdBy --> User (quién registró el movimiento)
 *
 * Tipos de movimiento:
 * - IN: entrada de stock (compra, devolución). Suma al stock actual.
 * - OUT: salida de stock (venta, pérdida). Resta del stock actual.
 * - ADJUSTMENT: ajuste manual. Establece el stock al valor indicado.
 *
 * Campos de auditoría:
 * - previousStock: stock del producto ANTES del movimiento.
 * - newStock: stock del producto DESPUÉS del movimiento.
 * Estos campos permiten reconstruir el historial sin recalcular.
 *
 * Regla de negocio:
 * - La creación de un movimiento SIEMPRE actualiza el stock del producto
 *   dentro de una transacción MongoDB (ver movement.service.js).
 */

const mongoose = require('mongoose');

const inventoryMovementSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'El producto es obligatorio'],
  },
  type: {
    type: String,
    enum: ['IN', 'OUT', 'ADJUSTMENT'],
    required: [true, 'El tipo de movimiento es obligatorio'],
  },
  quantity: {
    type: Number,
    required: [true, 'La cantidad es obligatoria'],
    min: [1, 'La cantidad debe ser al menos 1'],
  },
  previousStock: {
    type: Number,
    required: true,
    min: 0,
  },
  newStock: {
    type: Number,
    required: true,
    min: 0,
  },
  reason: {
    type: String,
    trim: true,
    maxlength: [500, 'La razón no puede exceder 500 caracteres'],
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

inventoryMovementSchema.index({ product: 1 });
inventoryMovementSchema.index({ createdBy: 1 });
inventoryMovementSchema.index({ createdAt: -1 });

inventoryMovementSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('InventoryMovement', inventoryMovementSchema);
