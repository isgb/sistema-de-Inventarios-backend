const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { registerValidation, loginValidation, refreshValidation } = require('../validations/auth.validation');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const rateLimit = require('express-rate-limit');

const router = Router();

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
