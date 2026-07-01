/**
 * @fileoverview Entry point para Vercel (serverless).
 *
 * En Vercel, Express no puede llamar app.listen() — el runtime ya maneja
 * el servidor HTTP. Este archivo exporta la app como handler y abre la
 * conexión a MongoDB solo si no hay una activa (cold start).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const app = require('../src/app');

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) return;

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI no está configurada en las variables de entorno de Vercel');
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });
}

module.exports = async (req, res) => {
  try {
    await ensureConnected();
  } catch (err) {
    return res.status(500).json({ success: false, message: `Error de conexión a MongoDB: ${err.message}` });
  }
  return app(req, res);
};
