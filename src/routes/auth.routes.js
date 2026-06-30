/**
 * @fileoverview Rutas de autenticación.
 *
 * Base: /api/auth
 *
 * Flujo de middleware por endpoint:
 * - POST /register → [registerValidation, validate] → controller.register
 * - POST /login    → [loginLimiter, loginValidation, validate] → controller.login
 * - POST /refresh  → [refreshValidation, validate] → controller.refresh
 * - POST /logout   → [authenticate] → controller.logout
 *
 * Seguridad:
 * - Login tiene rate limiter dedicado (10 intentos / 15 min por IP),
 *   adicional al rate limiter global y al bloqueo de cuenta del service.
 * - Register y refresh son públicos pero protegidos por el rate limiter global.
 * - Logout requiere autenticación (necesita req.user para invalidar el refresh token).
 */

const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { registerValidation, loginValidation, refreshValidation } = require('../validations/auth.validation');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const rateLimit = require('express-rate-limit');

const router = Router();

/** Rate limiter exclusivo para login: 10 intentos cada 15 minutos por IP */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginLimiter, loginValidation, validate, authController.login);
router.post('/refresh', refreshValidation, validate, authController.refresh);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
