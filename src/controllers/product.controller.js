const productService = require('../services/product.service');

async function getAll(req, res, next) {
  try {
    const products = await productService.getAll();
    res.json(products);
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const product = await productService.getById(req.params.id);
    res.json(product);
  } catch (error) {
    next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const stats = await productService.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const product = await productService.create(req.body, req.user._id);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const product = await productService.update(req.params.id, req.body);
    res.json(product);
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    await productService.remove(req.params.id);
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAll, getById, getStats, create, update, remove };
