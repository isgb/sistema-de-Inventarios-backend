const Category = require('../models/Category');

async function getAll() {
  return Category.find({ active: true }).sort({ name: 1 });
}

async function create(data) {
  return Category.create(data);
}

module.exports = { getAll, create };
