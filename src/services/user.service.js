const User = require('../models/User');
const { canAssignRole, ROLES } = require('../config/roles');
const AppError = require('../utils/AppError');

async function getAll() {
  return User.find().sort({ createdAt: -1 });
}

async function create({ name, email, password, role }, creatorRole) {
  if (![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(creatorRole)) {
    throw new AppError('No tienes permisos para crear usuarios', 403);
  }

  const targetRole = role || ROLES.USER;

  if (!canAssignRole(creatorRole, targetRole)) {
    throw new AppError('No puedes asignar un rol igual o superior al tuyo', 403);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('Este correo ya está registrado', 409);
  }

  return User.create({ name, email, password, role: targetRole });
}

module.exports = { getAll, create };
