/**
 * @fileoverview Controller de gestión de productos del inventario.
 *
 * Endpoints:
 * - GET /api/products → getAll()
 *   Permiso: products:read
 *   Salida: lista de productos con categoría y creador populados
 *
 * - GET /api/products/stats → getStats()
 *   Permiso: products:read
 *   Salida: { totalProducts, totalStock, totalValue, lowStock, outOfStock, categories }
 *   Nota: usa aggregation de MongoDB, no carga documentos en memoria.
 *
 * - GET /api/products/:id → getById()
 *   Permiso: products:read
 *   Salida: producto individual con categoría y creador
 *
 * - POST /api/products → create()
 *   Permiso: products:create
 *   Entrada: { name, sku, category (ObjectId), price, stock?, minStock?, description? }
 *   Salida: producto creado
 *
 * - PUT /api/products/:id → update()
 *   Permiso: products:update
 *   Entrada: campos a actualizar (todos opcionales)
 *   Salida: producto actualizado
 *
 * - DELETE /api/products/:id → remove()
 *   Permiso: products:delete
 *   Salida: null
 *
 * - POST /api/products/import/preview → previewImport()
 *   Permiso: products:create
 *   Entrada: multipart/form-data, campo 'file' (.xlsx, máx 3MB)
 *   Salida: { valid, errors, totalRows } — no escribe en la DB
 *
 * - POST /api/products/import/confirm → confirmImport()
 *   Permiso: products:create
 *   Entrada: { rows: Object[] } (las filas 'valid' devueltas por el preview)
 *   Salida: { created, failed, errors }
 *
 * - GET /api/products/export → exportAll()
 *   Permiso: products:read
 *   Salida: archivo .xlsx (no usa el envoltorio sendSuccess, es una descarga binaria)
 */

const productService = require('../services/product.service');
const { sendSuccess } = require('../utils/response');
const AppError = require('../utils/AppError');

async function getAll(req, res, next) {
  try {
    const result = await productService.getAll(req.query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const product = await productService.getById(req.params.id);
    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const stats = await productService.getStats();
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const product = await productService.create(req.body, req.user._id);
    sendSuccess(res, product, 201, 'Producto creado exitosamente');
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const product = await productService.update(req.params.id, req.body, req.user._id);
    sendSuccess(res, product, 200, 'Producto actualizado');
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    await productService.remove(req.params.id, req.user._id);
    sendSuccess(res, null, 200, 'Producto eliminado correctamente');
  } catch (error) {
    next(error);
  }
}

async function previewImport(req, res, next) {
  try {
    if (!req.file) throw new AppError('Debes adjuntar un archivo .xlsx', 400);
    const result = await productService.previewImport(req.file.buffer);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function confirmImport(req, res, next) {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    if (rows.length === 0) throw new AppError('No hay filas para importar', 400);
    const result = await productService.confirmImport(rows, req.user._id);
    sendSuccess(res, result, 201, `${result.created} producto(s) importado(s)`);
  } catch (error) {
    next(error);
  }
}

async function exportAll(req, res, next) {
  try {
    const workbook = await productService.exportAll();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="inventario.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
}

module.exports = { getAll, getById, getStats, create, update, remove, previewImport, confirmImport, exportAll };
