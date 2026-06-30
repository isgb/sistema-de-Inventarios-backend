/**
 * @fileoverview Controller de gestión de categorías.
 *
 * Endpoints:
 * - GET /api/categories → getAll()
 *   Permiso: categories:read
 *   Query: ?all=true incluye categorías inactivas (gestión)
 *   Salida: lista de categorías ordenadas alfabéticamente
 *
 * - POST /api/categories → create()
 *   Permiso: categories:create
 *   Entrada: { name }
 *   Salida: categoría creada
 *
 * - PUT /api/categories/:id → update()
 *   Permiso: categories:update
 *   Entrada: { name?, active? }
 *   Salida: categoría actualizada
 */

const categoryService = require('../services/category.service');
const { sendSuccess } = require('../utils/response');

async function getAll(req, res, next) {
  try {
    const categories = await categoryService.getAll(req.query.all === 'true');
    sendSuccess(res, categories);
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const category = await categoryService.create(req.body, req.user._id);
    sendSuccess(res, category, 201, 'Categoría creada exitosamente');
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const category = await categoryService.update(req.params.id, req.body, req.user._id);
    sendSuccess(res, category, 200, 'Categoría actualizada exitosamente');
  } catch (error) {
    next(error);
  }
}

module.exports = { getAll, create, update };
