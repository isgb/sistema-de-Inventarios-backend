/**
 * @fileoverview Modelo de usuario del sistema.
 *
 * Responsabilidad:
 * Almacena datos de perfil, credenciales y estado de cuenta.
 * NO contiene roles ni permisos, estos se manejan en UserRole (RBAC desacoplado).
 *
 * Relaciones:
 * - User <-- UserRole --> Role (N:N, roles asignados al usuario)
 * - User <-- Product.createdBy (quién creó cada producto)
 * - User <-- InventoryMovement.createdBy (quién registró cada movimiento)
 *
 * Campos sensibles (select: false, nunca se envían al cliente):
 * - password: hash bcrypt de 12 rounds
 * - refreshToken: hash bcrypt del refresh token activo
 * - loginAttempts: contador de intentos fallidos consecutivos
 * - lockUntil: fecha límite del bloqueo temporal
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email no válido'],
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked'],
    default: 'active',
  },
  loginAttempts: {
    type: Number,
    default: 0,
    select: false,
  },
  lockUntil: {
    type: Date,
    select: false,
  },
  refreshToken: {
    type: String,
    select: false,
  },
  isSeed: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

userSchema.index({ status: 1 });

/**
 * Hook pre-save: hashea la contraseña antes de guardar.
 * Solo se ejecuta si el campo password fue modificado.
 * Usa bcrypt con 12 rounds de sal.
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/**
 * Compara una contraseña en texto plano contra el hash almacenado.
 * Requiere que el documento se haya cargado con select('+password').
 *
 * @param {string} candidatePassword - Contraseña en texto plano del formulario de login.
 * @returns {Promise<boolean>} true si coincide, false si no.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Limpia campos sensibles y legacy al serializar a JSON.
 * Elimina: password, refreshToken, loginAttempts, lockUntil, role (campo legacy), __v.
 */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  delete obj.role;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
