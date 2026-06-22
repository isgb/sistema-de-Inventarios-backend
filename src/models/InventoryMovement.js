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

inventoryMovementSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('InventoryMovement', inventoryMovementSchema);
