const categoryService = require('../services/category.service');

async function getAll(req, res, next) {
  try {
    const categories = await categoryService.getAll();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const category = await categoryService.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAll, create };
