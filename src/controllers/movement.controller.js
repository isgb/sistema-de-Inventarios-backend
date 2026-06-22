const movementService = require('../services/movement.service');

async function getAll(req, res, next) {
  try {
    const movements = await movementService.getAll();
    res.json({ success: true, data: movements });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const movement = await movementService.create(req.body, req.user._id);
    res.status(201).json({ success: true, data: movement });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAll, create };
