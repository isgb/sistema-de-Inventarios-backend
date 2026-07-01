/**
 * @fileoverview Servicio de gestión de categorías.
 *
 * Responsabilidad:
 * Listar y crear categorías de productos.
 * Solo se muestran categorías activas en los listados.
 */

const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const activityService = require('./activity.service');

/**
 * Obtiene categorías ordenadas alfabéticamente.
 * Por defecto solo las activas; con includeInactive=true devuelve todas
 * (usado en la pantalla de gestión para poder reactivar una categoría).
 *
 * @param {boolean} [includeInactive=false]
 * @returns {Promise<Category[]>}
 */
async function getAll(includeInactive = false) {
  const filter = includeInactive ? {} : { active: true };
  return Category.find(filter).sort({ name: 1 });
}

/**
 * Crea una nueva categoría.
 * Si el nombre ya existe, Mongoose lanza un error de duplicado
 * que errorHandler convierte en 409.
 *
 * @param {{ name: string }} data
 * @param {string} userId - Usuario que crea la categoría.
 * @returns {Promise<Category>}
 */
async function create(data, userId) {
  const category = await Category.create(data);
  await activityService.log(userId, `Categoría creada: ${category.name}`, 'create');
  return category;
}

/**
 * Actualiza el nombre y/o el estado activo de una categoría.
 *
 * @param {string} id - ObjectId de la categoría.
 * @param {{ name?: string, active?: boolean }} data
 * @param {string} userId - Usuario que realiza la actualización.
 * @returns {Promise<Category>} Categoría actualizada.
 * @throws {AppError} 404 si no existe.
 */
async function update(id, data, userId) {
  const category = await Category.findById(id);
  if (!category) throw new AppError('Categoría no encontrada', 404);
  if (category.isSeed && data.active === false) {
    throw new AppError('Esta categoría es parte de los datos de demo y no puede desactivarse', 403);
  }

  const updated = await Category.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!updated) throw new AppError('Categoría no encontrada', 404);

  const action = data.active !== undefined
    ? `Categoría ${data.active ? 'activada' : 'desactivada'}: ${category.name}`
    : `Categoría actualizada: ${category.name}`;
  await activityService.log(userId, action, 'update');

  return updated;
}

module.exports = { getAll, create, update };
