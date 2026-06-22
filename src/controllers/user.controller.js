const userService = require('../services/user.service');

async function getAll(req, res, next) {
  try {
    const users = await userService.getAll();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const user = await userService.create(req.body, req.user.role);
    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAll, create };
