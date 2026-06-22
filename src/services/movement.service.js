const InventoryMovement = require('../models/InventoryMovement');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');

async function getAll() {
  return InventoryMovement.find()
    .populate('product', 'name sku')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
}

async function create({ product: productId, type, quantity, reason }, userId) {
  const product = await Product.findById(productId);
  if (!product) throw new AppError('Producto no encontrado', 404);

  if (type === 'OUT' && product.stock < quantity) {
    throw new AppError(`Stock insuficiente. Disponible: ${product.stock}`, 400);
  }

  if (type === 'IN') {
    product.stock += quantity;
  } else if (type === 'OUT') {
    product.stock -= quantity;
  } else {
    product.stock = quantity;
  }

  await product.save();

  return InventoryMovement.create({
    product: productId,
    type,
    quantity,
    reason,
    createdBy: userId,
  });
}

module.exports = { getAll, create };
