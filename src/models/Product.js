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
    type: String,
    required: [true, 'La categoría es obligatoria'],
    trim: true,
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
}, {
  timestamps: true,
});

productSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Product', productSchema);
