/**
 * @fileoverview Servicio de gestión de usuarios.
 *
 * Responsabilidad:
 * Listar, crear y actualizar usuarios. La creación incluye asignación de rol
 * con validación de elevación de privilegios vía role.service.js.
 */

const User = require('../models/User');
const Role = require('../models/Role');
const UserRole = require('../models/UserRole');
const { assignRoleToUser } = require('./role.service');
const { getUserRoleNames } = require('./permission.service');
const AppError = require('../utils/AppError');
const activityService = require('./activity.service');

/**
 * Obtiene usuarios paginados con sus roles.
 *
 * @param {{ page?: number, limit?: number }} [query={}]
 * @returns {Promise<{ items: Object[], total: number, page: number, totalPages: number }>}
 */
async function getAll(query = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);

  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(),
  ]);

  const items = await Promise.all(
    users.map(async (user) => {
      const roles = await getUserRoleNames(user._id);
      return { ...user.toJSON(), roles };
    })
  );

  return { items, total, page, totalPages: Math.max(Math.ceil(total / limit), 1) };
}

/**
 * Obtiene un usuario por su ID con sus roles.
 *
 * @param {string} id
 * @returns {Promise<Object>}
 * @throws {AppError} 404 si no existe.
 */
async function getById(id) {
  const user = await User.findById(id);
  if (!user) throw new AppError('Usuario no encontrado', 404);

  const roles = await getUserRoleNames(user._id);
  return { ...user.toJSON(), roles };
}

/**
 * Crea un nuevo usuario y le asigna un rol.
 *
 * Flujo:
 * 1. Verifica que el email no exista.
 * 2. Busca el rol solicitado (o USER por defecto).
 * 3. Crea el usuario (la contraseña se hashea automáticamente).
 * 4. Asigna el rol vía role.service.assignRoleToUser, que valida
 *    que el creador tenga todos los permisos del rol que asigna.
 *
 * @param {{ name: string, email: string, password: string, roleName?: string }} data
 * @param {string} creatorId - ID del usuario que crea (para validar elevación de privilegios).
 * @returns {Promise<Object>} Usuario creado con sus roles.
 * @throws {AppError} 409 email duplicado, 404 rol no encontrado, 403 elevación de privilegios.
 */
async function create({ name, email, password, roleName }, creatorId) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('Este correo ya está registrado', 409);
  }

  const targetRoleName = roleName || 'USER';
  const role = await Role.findOne({ name: targetRoleName, active: true });
  if (!role) {
    throw new AppError(`Rol '${targetRoleName}' no encontrado`, 404);
  }

  const user = await User.create({ name, email, password });

  await assignRoleToUser(user._id, role._id, creatorId);
  await activityService.log(creatorId, `Usuario creado: ${user.email}`, 'create');

  const roles = await getUserRoleNames(user._id);
  return { ...user.toJSON(), roles };
}

/**
 * Actualiza la información de un usuario existente.
 *
 * Flujo:
 * 1. Busca el usuario por ID.
 * 2. Actualiza name, email y status si se proporcionan.
 * 3. Si se incluye password, se asigna al documento para que
 *    el hook pre-save de Mongoose lo hashee automáticamente.
 * 4. Guarda con save() (no findByIdAndUpdate) para activar hooks.
 *
 * @param {string} id - ID del usuario a actualizar.
 * @param {{ name?: string, email?: string, password?: string, status?: string }} data
 * @param {string} actorId - Usuario que realiza la actualización.
 * @returns {Promise<Object>} Usuario actualizado con roles.
 * @throws {AppError} 404 si no existe, 409 si el email ya está en uso.
 */
async function update(id, data, actorId) {
  const user = await User.findById(id).select('+password');
  if (!user) throw new AppError('Usuario no encontrado', 404);

  if (user.isSeed && data.status && data.status !== 'active') {
    throw new AppError('Este usuario es parte de los datos de demo y no puede desactivarse', 403);
  }

  if (data.email && data.email !== user.email) {
    const emailTaken = await User.findOne({ email: data.email, _id: { $ne: id } });
    if (emailTaken) throw new AppError('Este correo ya está en uso por otro usuario', 409);
  }

  if (data.name !== undefined) user.name = data.name;
  if (data.email !== undefined) user.email = data.email;
  if (data.status !== undefined) user.status = data.status;
  if (data.password && data.password.length >= 6) user.password = data.password;

  await user.save();
  await activityService.log(actorId, `Usuario actualizado: ${user.email}`, 'update');

  const roles = await getUserRoleNames(user._id);
  return { ...user.toJSON(), roles };
}

module.exports = { getAll, getById, create, update };
