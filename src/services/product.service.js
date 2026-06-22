const Product = require('../models/Product');
const AppError = require('../utils/AppError');

async function getAll() {
  return Product.find().populate('createdBy', 'name email').sort({ createdAt: -1 });
}

async function getById(id) {
  const product = await Product.findById(id).populate('createdBy', 'name email');
  if (!product) throw new AppError('Producto no encontrado', 404);
  return product;
}

async function getStats() {
  const products = await Product.find();
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
  const outOfStock = products.filter(p => p.stock === 0).length;
  const categories = new Set(products.map(p => p.category)).size;

  return { totalProducts, totalStock, totalValue, lowStock, outOfStock, categories };
}

async function create(data, userId) {
  return Product.create({ ...data, createdBy: userId });
}

async function update(id, data) {
  const product = await Product.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!product) throw new AppError('Producto no encontrado', 404);
  return product;
}

async function remove(id) {
  const product = await Product.findByIdAndDelete(id);
  if (!product) throw new AppError('Producto no encontrado', 404);
  return product;
}

module.exports = { getAll, getById, getStats, create, update, remove };
