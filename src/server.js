/**
 * @fileoverview Punto de entrada del servidor.
 *
 * Responsabilidad:
 * Carga variables de entorno, conecta a MongoDB e inicia el servidor HTTP.
 * La configuración de Express está en app.js (separada para testabilidad).
 *
 * Flujo de arranque:
 * 1. dotenv carga las variables de .env.
 * 2. connectDB establece conexión con MongoDB.
 * 3. app.listen inicia el servidor en el puerto configurado.
 *
 * Si MongoDB no está disponible, connectDB hace process.exit(1)
 * y el servidor no arranca.
 */

require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
}

start();
