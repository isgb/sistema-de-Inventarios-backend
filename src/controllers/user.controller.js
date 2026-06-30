/**
 * @fileoverview Controller de gestión de usuarios.
 *
 * Endpoints:
 * - GET /api/users → getAll()
 *   Permiso: users:read
 *   Salida: lista de usuarios con sus roles
 *
 * - GET /api/users/:id → getById()
 *   Permiso: users:read
 *   Salida: usuario con roles
 *
 * - POST /api/users → create()
 *   Permiso: users:create
 *   Entrada: { name, email, password, roleName? }
 *   Salida: usuario creado con roles
 *
 * - PUT /api/users/:id → update()
 *   Permiso: users:update
 *   Entrada: { name?, email?, password?, status? }
 *   Salida: usuario actualizado con roles
 */

const userService = require('../services/user.service');
const { sendSuccess } = require('../utils/response');

async function getAll(req, res, next) {
  try {
    const result = await userService.getAll(req.query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const user = await userService.getById(req.params.id);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const user = await userService.create(req.body, req.user._id);
    sendSuccess(res, user, 201, 'Usuario creado exitosamente');
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const user = await userService.update(req.params.id, req.body, req.user._id);
    sendSuccess(res, user, 200, 'Usuario actualizado exitosamente');
  } catch (error) {
    next(error);
  }
}

module.exports = { getAll, getById, create, update };
