/**
 * @fileoverview Conexión a MongoDB.
 *
 * Responsabilidad:
 * Establece la conexión a MongoDB usando Mongoose.
 * Se ejecuta una vez al iniciar el servidor (server.js).
 * Si la conexión falla, el proceso termina con exit(1)
 * para evitar que el servidor arranque sin base de datos.
 *
 * Variable de entorno requerida:
 * - MONGODB_URI: URI de conexión (e.g. mongodb://localhost:27017/inventario_empresarial)
 */

const mongoose = require('mongoose');

async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
