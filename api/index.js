/**
 * @fileoverview Entry point para Vercel (serverless).
 *
 * bufferCommands: false evita que las queries esperen en cola si no hay
 * conexión activa — en serverless queremos fallo inmediato, no timeout silencioso.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const app = require('../src/app');

// Desactiva el buffer de Mongoose: si no hay conexión, las queries fallan de inmediato
mongoose.set('bufferCommands', false);

let connecting = null;

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) return;

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI no configurada en las variables de entorno de Vercel');
  }

  // Reutiliza la promesa de conexión si ya hay un intento en curso
  if (!connecting) {
    connecting = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    }).catch((err) => {
      connecting = null;
      throw err;
    });
  }

  await connecting;
}

module.exports = async (req, res) => {
  try {
    await ensureConnected();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `No se pudo conectar a MongoDB: ${err.message}`,
    });
  }
  return app(req, res);
};
