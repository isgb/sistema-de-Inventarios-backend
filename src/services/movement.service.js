/**
 * @fileoverview Servicio de movimientos de inventario.
 *
 * Responsabilidad:
 * Registra entradas, salidas y ajustes de stock.
 * Actualiza el stock del producto y crea el registro de movimiento.
 *
 * Tipos de movimiento:
 * - IN: suma quantity al stock actual (compra, devolución).
 * - OUT: resta quantity del stock actual (venta, pérdida). Valida stock suficiente.
 * - ADJUSTMENT: establece el stock al valor de quantity (ajuste manual).
 *
 * Auditoría:
 * Cada movimiento registra previousStock y newStock para permitir
 * reconstruir el historial sin recalcular.
 *
 * Nota sobre transacciones:
 * Si MongoDB tiene replica set, se usa transacción para atomicidad.
 * Si no (desarrollo local standalone), se ejecuta sin transacción.
 */

const mongoose = require('mongoose');
const InventoryMovement = require('../models/InventoryMovement');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const activityService = require('./activity.service');

/**
 * Construye el filtro de Mongo a partir de los query params de la lista.
 *
 * @param {{ product?: string, type?: string, startDate?: string, endDate?: string }} query
 * @returns {Object} Filtro de Mongoose.
 */
function buildFilter({ product, type, startDate, endDate }) {
  const filter = {};

  if (product) filter.product = product;
  if (type && ['IN', 'OUT', 'ADJUSTMENT'].includes(type)) filter.type = type;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  return filter;
}

/**
 * Obtiene movimientos paginados con filtro por producto, tipo y rango de fechas.
 *
 * @param {{ page?: number, limit?: number, product?: string, type?: string,
 *   startDate?: string, endDate?: string }} [query={}]
 * @returns {Promise<{ items: InventoryMovement[], total: number, page: number, totalPages: number }>}
 */
async function getAll(query = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const filter = buildFilter(query);

  const [items, total] = await Promise.all([
    InventoryMovement.find(filter)
      .populate('product', 'name sku')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    InventoryMovement.countDocuments(filter),
  ]);

  return { items, total, page, totalPages: Math.max(Math.ceil(total / limit), 1) };
}

/**
 * Calcula el nuevo stock según el tipo de movimiento.
 *
 * @param {number} currentStock
 * @param {string} type - IN, OUT o ADJUSTMENT.
 * @param {number} quantity
 * @returns {number} Nuevo stock calculado.
 * @throws {AppError} 400 si stock insuficiente para OUT.
 */
function calculateNewStock(currentStock, type, quantity) {
  if (type === 'IN') return currentStock + quantity;
  if (type === 'OUT') {
    if (currentStock < quantity) {
      throw new AppError(`Stock insuficiente. Disponible: ${currentStock}`, 400);
    }
    return currentStock - quantity;
  }
  return quantity;
}

/**
 * Crea un movimiento de inventario y actualiza el stock del producto.
 * Intenta usar transacción MongoDB. Si no hay replica set disponible,
 * ejecuta las operaciones secuencialmente sin transacción.
 *
 * @param {{ product: string, type: string, quantity: number, reason?: string }} data
 * @param {string} userId
 * @returns {Promise<InventoryMovement>}
 */
async function create({ product: productId, type, quantity, reason }, userId) {
  const supportsTransactions = await checkReplicaSetSupport();

  const movement = supportsTransactions
    ? await createWithTransaction(productId, type, quantity, reason, userId)
    : await createWithoutTransaction(productId, type, quantity, reason, userId);

  const product = await Product.findById(productId).select('name');
  const MOVEMENT_LABELS = { IN: 'Entrada', OUT: 'Salida', ADJUSTMENT: 'Ajuste' };
  await activityService.log(
    userId,
    `${MOVEMENT_LABELS[type]} registrada: ${quantity} uds de ${product?.name || 'producto eliminado'}`,
    'create',
  );

  return movement;
}

/** @private Ejecuta con transacción MongoDB (requiere replica set). */
async function createWithTransaction(productId, type, quantity, reason, userId) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await Product.findById(productId).session(session);
    if (!product) throw new AppError('Producto no encontrado', 404);

    const previousStock = product.stock;
    const newStock = calculateNewStock(previousStock, type, quantity);

    product.stock = newStock;
    await product.save({ session });

    const [movement] = await InventoryMovement.create([{
      product: productId, type, quantity, previousStock, newStock, reason, createdBy: userId,
    }], { session });

    await session.commitTransaction();
    return movement;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/** @private Ejecuta sin transacción (MongoDB standalone en desarrollo). */
async function createWithoutTransaction(productId, type, quantity, reason, userId) {
  const product = await Product.findById(productId);
  if (!product) throw new AppError('Producto no encontrado', 404);

  const previousStock = product.stock;
  const newStock = calculateNewStock(previousStock, type, quantity);

  product.stock = newStock;
  await product.save();

  return InventoryMovement.create({
    product: productId, type, quantity, previousStock, newStock, reason, createdBy: userId,
  });
}

/**
 * Detecta si MongoDB soporta transacciones (replica set o mongos).
 * Cachea el resultado para no consultarlo en cada petición.
 */
let replicaSetSupported = null;

async function checkReplicaSetSupport() {
  if (replicaSetSupported !== null) return replicaSetSupported;

  try {
    const admin = mongoose.connection.db.admin();
    const info = await admin.command({ replSetGetStatus: 1 });
    replicaSetSupported = !!info.ok;
  } catch {
    replicaSetSupported = false;
  }
  return replicaSetSupported;
}

module.exports = { getAll, create };
