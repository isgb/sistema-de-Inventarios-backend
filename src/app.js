/**
 * @fileoverview Configuración de Express y registro de middleware globales.
 *
 * Responsabilidad:
 * Configura la aplicación Express con todas las capas de seguridad,
 * parseo, sanitización y rutas. NO inicia el servidor (eso lo hace server.js).
 *
 * Orden de middleware (importa):
 * 1. Helmet → headers de seguridad HTTP.
 * 2. CORS → restringe orígenes permitidos.
 * 3. Rate Limiter → limita peticiones por IP (100/15min).
 * 4. Body Parser → parsea JSON y URL-encoded (max 10kb).
 * 5. Mongo Sanitize → elimina operadores $ y . para prevenir NoSQL injection.
 * 6. Rutas → endpoints de la API.
 * 7. 404 handler → rutas no encontradas.
 * 8. Error handler → último middleware, atrapa todos los errores.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const movementRoutes = require('./routes/movement.routes');
const roleRoutes = require('./routes/role.routes');
const activityRoutes = require('./routes/activity.routes');

const app = express();

// --- Seguridad ---
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

/** Rate limiter global: 100 peticiones cada 15 minutos por IP */
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas peticiones. Intenta más tarde' },
});
app.use(globalLimiter);

// --- Parseo (límite de 10kb para prevenir payloads excesivos) ---
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// --- Sanitización NoSQL (elimina operadores $gt, $ne, etc. del body) ---
app.use(mongoSanitize());

// --- Rutas de la API ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/activity', activityRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

app.use(errorHandler);

module.exports = app;
