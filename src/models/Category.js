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
}, {
  timestamps: true,
});

categorySchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Category', categorySchema);
