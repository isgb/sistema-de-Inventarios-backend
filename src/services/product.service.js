/**
 * @fileoverview Servicio de gestión de productos del inventario.
 *
 * Responsabilidad:
 * CRUD de productos y cálculo de estadísticas del dashboard.
 * Valida la existencia de la categoría antes de crear o actualizar.
 *
 * Estadísticas (getStats):
 * Usa aggregation pipeline de MongoDB para calcular en una sola query:
 * totalProducts, totalStock, totalValue, lowStock, outOfStock, categories.
 */

const ExcelJS = require('exceljs');
const Product = require('../models/Product');
const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const activityService = require('./activity.service');

/** Columnas esperadas en el Excel de importación, normalizadas (sin acentos/espacios) → campo del producto. */
const IMPORT_COLUMN_MAP = {
  nombre: 'name',
  sku: 'sku',
  categoria: 'category',
  precio: 'price',
  stock: 'stock',
  stockminimo: 'minStock',
  descripcion: 'description',
};

const MAX_IMPORT_ROWS = 500;

/** Quita acentos, espacios y mayúsculas para emparejar encabezados de forma flexible. */
function normalizeHeader(text) {
  return String(text || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Campos por los que se puede ordenar directamente en MongoDB. */
const SORTABLE_FIELDS = ['name', 'sku', 'price', 'stock', 'createdAt'];

/** Escapa caracteres especiales de regex para que la búsqueda no se interprete como patrón. */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Construye el filtro de Mongo a partir de los query params de la lista.
 *
 * @param {{ search?: string, category?: string, status?: string }} query
 * @returns {Object} Filtro de Mongoose.
 */
function buildFilter({ search, category, status }) {
  const filter = {};

  if (search) {
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: regex }, { sku: regex }];
  }

  if (category) {
    filter.category = category;
  }

  if (status === 'out') {
    filter.stock = 0;
  } else if (status === 'low') {
    filter.stock = { $gt: 0 };
    filter.$expr = { $lte: ['$stock', '$minStock'] };
  } else if (status === 'available') {
    filter.stock = { $gt: 0 };
    filter.$expr = { $gt: ['$stock', '$minStock'] };
  }

  return filter;
}

/**
 * Obtiene productos paginados con su categoría y creador.
 * Soporta búsqueda por nombre/SKU, filtro por categoría y estado de stock.
 *
 * @param {{ page?: number, limit?: number, search?: string, category?: string,
 *   status?: 'available'|'low'|'out', sort?: string, dir?: 'asc'|'desc' }} [query={}]
 * @returns {Promise<{ items: Product[], total: number, page: number, totalPages: number }>}
 */
async function getAll(query = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const filter = buildFilter(query);

  const sortField = SORTABLE_FIELDS.includes(query.sort) ? query.sort : 'createdAt';
  const sortDir = query.dir === 'asc' ? 1 : -1;

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name')
      .populate('createdBy', 'name email')
      .sort({ [sortField]: sortDir })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  return { items, total, page, totalPages: Math.max(Math.ceil(total / limit), 1) };
}

/**
 * Obtiene un producto por su ID con datos de categoría y creador.
 *
 * @param {string} id - ObjectId del producto.
 * @returns {Promise<Product>}
 * @throws {AppError} 404 si no existe.
 */
async function getById(id) {
  const product = await Product.findById(id)
    .populate('category', 'name')
    .populate('createdBy', 'name email');

  if (!product) throw new AppError('Producto no encontrado', 404);
  return product;
}

/**
 * Calcula estadísticas del inventario para el dashboard.
 * Usa aggregation pipeline de MongoDB para procesar todo en el servidor de DB,
 * sin cargar documentos individuales en memoria de Node.js.
 *
 * Métricas calculadas:
 * - totalProducts: cantidad total de productos registrados.
 * - totalStock: suma de todas las unidades en stock.
 * - totalValue: valor monetario total (precio × stock por producto).
 * - lowStock: productos con stock > 0 pero <= minStock (necesitan reposición).
 * - outOfStock: productos con stock = 0 (agotados).
 * - categories: cantidad de categorías distintas con al menos un producto.
 *
 * @returns {Promise<Object>} Estadísticas del inventario.
 */
async function getStats() {
  const [stats] = await Product.aggregate([
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalStock: { $sum: '$stock' },
        totalValue: { $sum: { $multiply: ['$price', '$stock'] } },
        lowStock: {
          $sum: {
            $cond: [
              { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$minStock'] }] },
              1,
              0,
            ],
          },
        },
        outOfStock: {
          $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] },
        },
        categories: { $addToSet: '$category' },
      },
    },
    {
      $project: {
        _id: 0,
        totalProducts: 1,
        totalStock: 1,
        totalValue: 1,
        lowStock: 1,
        outOfStock: 1,
        categories: { $size: '$categories' },
      },
    },
  ]);

  return stats || {
    totalProducts: 0,
    totalStock: 0,
    totalValue: 0,
    lowStock: 0,
    outOfStock: 0,
    categories: 0,
  };
}

/**
 * Crea un producto validando que la categoría exista y esté activa.
 *
 * @param {Object} data - Datos del producto (name, sku, category, price, stock, etc.).
 * @param {string} userId - ID del usuario que crea el producto.
 * @returns {Promise<Product>} Producto creado.
 * @throws {AppError} 404 si la categoría no existe o está inactiva.
 */
async function create(data, userId) {
  const category = await Category.findById(data.category);
  if (!category || !category.active) {
    throw new AppError('Categoría no encontrada o inactiva', 404);
  }

  const product = await Product.create({ ...data, createdBy: userId });
  await activityService.log(userId, `Producto creado: ${product.name}`, 'create');
  return product;
}

/**
 * Actualiza un producto existente. Si se cambia la categoría, valida que exista.
 *
 * @param {string} id - ObjectId del producto.
 * @param {Object} data - Campos a actualizar.
 * @param {string} userId - Usuario que realiza la actualización.
 * @returns {Promise<Product>} Producto actualizado.
 * @throws {AppError} 404 si el producto o la categoría no existen.
 */
async function update(id, data, userId) {
  if (data.category) {
    const category = await Category.findById(data.category);
    if (!category || !category.active) {
      throw new AppError('Categoría no encontrada o inactiva', 404);
    }
  }

  const product = await Product.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).populate('category', 'name');

  if (!product) throw new AppError('Producto no encontrado', 404);
  await activityService.log(userId, `Producto actualizado: ${product.name}`, 'update');
  return product;
}

/**
 * Elimina un producto del inventario de forma permanente.
 *
 * @param {string} id - ObjectId del producto.
 * @param {string} userId - Usuario que realiza la eliminación.
 * @returns {Promise<Product>} Producto eliminado.
 * @throws {AppError} 404 si no existe.
 */
async function remove(id, userId) {
  const product = await Product.findById(id);
  if (!product) throw new AppError('Producto no encontrado', 404);
  if (product.isSeed) throw new AppError('Este producto es parte de los datos de demo y no puede eliminarse', 403);

  await Product.findByIdAndDelete(id);
  await activityService.log(userId, `Producto eliminado: ${product.name}`, 'delete');
  return product;
}

/**
 * Lee el primer worksheet de un buffer .xlsx y lo convierte en filas crudas
 * usando IMPORT_COLUMN_MAP para reconocer encabezados (sin acentos/mayúsculas).
 *
 * @param {Buffer} buffer - Contenido del archivo subido.
 * @returns {Promise<Object[]>} Filas con claves name/sku/category/price/stock/minStock/description.
 * @throws {AppError} 400 si el archivo está vacío o supera MAX_IMPORT_ROWS.
 */
async function parseExcelBuffer(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) {
    throw new AppError('El archivo no tiene filas de datos', 400);
  }
  if (sheet.rowCount - 1 > MAX_IMPORT_ROWS) {
    throw new AppError(`Máximo ${MAX_IMPORT_ROWS} filas por importación`, 400);
  }

  const headerCells = sheet.getRow(1).values;
  const columnFields = headerCells.map((header) => IMPORT_COLUMN_MAP[normalizeHeader(header)] || null);

  const rows = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const cells = sheet.getRow(rowNumber).values;
    if (cells.length <= 1) continue;

    const row = {};
    columnFields.forEach((field, index) => {
      if (field) row[field] = cells[index];
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Valida filas de importación: campos obligatorios, tipos y existencia de categoría
 * activa (por nombre). No escribe en la base de datos.
 *
 * @param {Object[]} rawRows - Filas crudas (name, sku, category, price, stock?, minStock?, description?).
 * @returns {Promise<{ valid: Object[], errors: { row: number, message: string }[] }>}
 */
async function validateImportRows(rawRows) {
  const categories = await Category.find({ active: true }).select('name');
  const categoryByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c]));
  const existingSkus = new Set((await Product.find().select('sku')).map((p) => p.sku));

  const valid = [];
  const errors = [];
  const skusInFile = new Set();

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2; // +1 por encabezado, +1 porque las filas no son 0-index
    const name = String(raw.name || '').trim();
    const sku = String(raw.sku || '').trim().toUpperCase();
    const categoryName = String(raw.category || '').trim();
    const price = Number(raw.price);
    const stock = raw.stock !== undefined && raw.stock !== '' ? Number(raw.stock) : 0;
    const minStock = raw.minStock !== undefined && raw.minStock !== '' ? Number(raw.minStock) : 0;
    const description = String(raw.description || '').trim();

    if (!name) return errors.push({ row: rowNumber, message: 'Nombre obligatorio' });
    if (!sku) return errors.push({ row: rowNumber, message: 'SKU obligatorio' });
    if (skusInFile.has(sku)) return errors.push({ row: rowNumber, message: `SKU duplicado en el archivo: ${sku}` });
    if (existingSkus.has(sku)) return errors.push({ row: rowNumber, message: `El SKU ya existe en el inventario: ${sku}` });
    if (!categoryName) return errors.push({ row: rowNumber, message: 'Categoría obligatoria' });

    const category = categoryByName.get(categoryName.toLowerCase());
    if (!category) return errors.push({ row: rowNumber, message: `Categoría no encontrada o inactiva: ${categoryName}` });

    if (Number.isNaN(price) || price < 0) return errors.push({ row: rowNumber, message: 'Precio inválido' });
    if (Number.isNaN(stock) || stock < 0) return errors.push({ row: rowNumber, message: 'Stock inválido' });
    if (Number.isNaN(minStock) || minStock < 0) return errors.push({ row: rowNumber, message: 'Stock mínimo inválido' });

    skusInFile.add(sku);
    valid.push({
      row: rowNumber,
      name,
      sku,
      categoryName: category.name,
      category: category._id,
      price,
      stock,
      minStock,
      description,
    });
  });

  return { valid, errors };
}

/**
 * Analiza un archivo .xlsx subido y devuelve un preview validado sin crear nada en la DB.
 *
 * @param {Buffer} buffer - Contenido del archivo subido.
 * @returns {Promise<{ valid: Object[], errors: Object[], totalRows: number }>}
 */
async function previewImport(buffer) {
  const rawRows = await parseExcelBuffer(buffer);
  const { valid, errors } = await validateImportRows(rawRows);
  return { valid, errors, totalRows: rawRows.length };
}

/**
 * Inserta en lote las filas previamente validadas en el preview.
 * Vuelve a validar contra el estado actual de la DB (categorías y SKUs pueden
 * haber cambiado entre el preview y la confirmación).
 *
 * @param {Object[]} rows - Filas devueltas por previewImport (se re-validan, no se confía en category/categoryName).
 * @param {string} userId - Usuario que ejecuta la importación.
 * @returns {Promise<{ created: number, failed: number, errors: Object[] }>}
 */
async function confirmImport(rows, userId) {
  const { valid, errors } = await validateImportRows(rows);

  if (valid.length === 0) {
    return { created: 0, failed: errors.length, errors };
  }

  const docs = valid.map(({ row, categoryName, ...data }) => ({ ...data, createdBy: userId }));
  let created = 0;
  const importErrors = [...errors];

  try {
    const inserted = await Product.insertMany(docs, { ordered: false });
    created = inserted.length;
  } catch (bulkError) {
    created = bulkError.insertedDocs ? bulkError.insertedDocs.length : 0;
    const writeErrors = bulkError.writeErrors || [];
    writeErrors.forEach((writeError) => {
      const failedDoc = docs[writeError.index];
      importErrors.push({ row: '-', message: `${failedDoc?.sku || 'fila'}: no se pudo insertar (posible duplicado)` });
    });
  }

  await activityService.log(
    userId,
    `Importación de productos: ${created} creados, ${importErrors.length} con error`,
    'create',
  );

  return { created, failed: importErrors.length, errors: importErrors };
}

/**
 * Genera un workbook .xlsx con el inventario completo (sin paginar) para exportación.
 *
 * @returns {Promise<ExcelJS.Workbook>}
 */
async function exportAll() {
  const products = await Product.find().populate('category', 'name').sort({ createdAt: -1 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Inventario');
  sheet.columns = [
    { header: 'Nombre', key: 'name', width: 32 },
    { header: 'SKU', key: 'sku', width: 18 },
    { header: 'Categoria', key: 'category', width: 20 },
    { header: 'Precio', key: 'price', width: 12 },
    { header: 'Stock', key: 'stock', width: 10 },
    { header: 'Stock Minimo', key: 'minStock', width: 14 },
    { header: 'Estado', key: 'status', width: 14 },
    { header: 'Descripcion', key: 'description', width: 40 },
    { header: 'Registro', key: 'createdAt', width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  products.forEach((product) => {
    const status = product.stock === 0 ? 'Sin stock' : product.stock <= product.minStock ? 'Stock bajo' : 'Disponible';
    sheet.addRow({
      name: product.name,
      sku: product.sku,
      category: product.category?.name || 'Sin categoría',
      price: product.price,
      stock: product.stock,
      minStock: product.minStock,
      status,
      description: product.description || '',
      createdAt: product.createdAt.toISOString().slice(0, 10),
    });
  });

  return workbook;
}

module.exports = { getAll, getById, getStats, create, update, remove, previewImport, confirmImport, exportAll };
