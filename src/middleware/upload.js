/**
 * @fileoverview Middleware de carga de archivos para importación de productos.
 *
 * Responsabilidad:
 * Configura multer en memoria (sin escribir a disco) para aceptar un único
 * archivo .xlsx de hasta 3MB en el campo 'file'. Rechaza cualquier otro
 * tipo de archivo antes de que llegue al controller.
 */

const multer = require('multer');
const AppError = require('../utils/AppError');

const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const isXlsx = file.mimetype === XLSX_MIME_TYPE || file.originalname.toLowerCase().endsWith('.xlsx');
  if (!isXlsx) {
    return cb(new AppError('Solo se aceptan archivos .xlsx', 400));
  }
  cb(null, true);
}

const uploadExcel = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 },
});

module.exports = uploadExcel;
