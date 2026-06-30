/**
 * @fileoverview Script de datos iniciales (seed) para el sistema.
 *
 * Responsabilidad:
 * Crea la estructura RBAC completa y los datos mínimos para que
 * el sistema funcione. Se ejecuta con: npm run seed
 *
 * Qué crea (en orden):
 * 1. Roles: SUPER_ADMIN, ADMIN, MANAGER, USER.
 * 2. Permisos: 15 combinaciones de resource:action.
 * 3. Mapeos rol-permiso: qué permisos tiene cada rol (34 mapeos).
 * 4. Usuario admin: admin@inventario.com / Admin123!
 * 5. Asignación: usuario admin ← rol SUPER_ADMIN.
 * 6. Categorías: 8 categorías de productos.
 *
 * Idempotencia:
 * Usa findOneAndUpdate con upsert: true en todos los registros.
 * Puede ejecutarse múltiples veces sin duplicar datos.
 * Si un registro ya existe, lo actualiza. Si no existe, lo crea.
 *
 * Para agregar un nuevo permiso:
 * 1. Agregar entrada en PERMISSIONS_DATA.
 * 2. Agregar la cadena 'resource:action' al rol correspondiente en ROLE_PERMISSIONS_MAP.
 * 3. Ejecutar npm run seed.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const RolePermission = require('../models/RolePermission');
const UserRole = require('../models/UserRole');
const Category = require('../models/Category');

/** Roles del sistema con su descripción */
const ROLES_DATA = [
  { name: 'SUPER_ADMIN', description: 'Acceso completo al sistema' },
  { name: 'ADMIN', description: 'Administrador de inventario y usuarios' },
  { name: 'MANAGER', description: 'Gestión de movimientos de inventario' },
  { name: 'USER', description: 'Solo lectura' },
];

/** Permisos disponibles: cada combinación resource + action es única */
const PERMISSIONS_DATA = [
  { resource: 'users', action: 'read', description: 'Ver usuarios' },
  { resource: 'users', action: 'create', description: 'Crear usuarios' },
  { resource: 'users', action: 'update', description: 'Actualizar usuarios' },
  { resource: 'users', action: 'delete', description: 'Eliminar usuarios' },
  { resource: 'users', action: 'assign-role', description: 'Asignar roles a usuarios' },
  { resource: 'products', action: 'read', description: 'Ver productos' },
  { resource: 'products', action: 'create', description: 'Crear productos' },
  { resource: 'products', action: 'update', description: 'Actualizar productos' },
  { resource: 'products', action: 'delete', description: 'Eliminar productos' },
  { resource: 'categories', action: 'read', description: 'Ver categorías' },
  { resource: 'categories', action: 'create', description: 'Crear categorías' },
  { resource: 'categories', action: 'update', description: 'Actualizar categorías' },
  { resource: 'movements', action: 'read', description: 'Ver movimientos' },
  { resource: 'movements', action: 'create', description: 'Crear movimientos' },
  { resource: 'roles', action: 'read', description: 'Ver roles y permisos' },
  { resource: 'activity', action: 'read', description: 'Ver actividad reciente del sistema' },
];

/**
 * Mapeo de permisos por rol.
 * Cada rol tiene los permisos listados como strings 'resource:action'.
 * Estos strings deben coincidir con las entradas de PERMISSIONS_DATA.
 */
const ROLE_PERMISSIONS_MAP = {
  SUPER_ADMIN: [
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:assign-role',
    'products:read', 'products:create', 'products:update', 'products:delete',
    'categories:read', 'categories:create', 'categories:update',
    'movements:read', 'movements:create',
    'roles:read',
    'activity:read',
  ],
  ADMIN: [
    'users:read', 'users:create', 'users:update',
    'products:read', 'products:create', 'products:update', 'products:delete',
    'categories:read', 'categories:create', 'categories:update',
    'movements:read', 'movements:create',
    'roles:read',
    'activity:read',
  ],
  MANAGER: [
    'products:read',
    'categories:read',
    'movements:read', 'movements:create',
    'activity:read',
  ],
  USER: [
    'products:read',
    'categories:read',
    'movements:read',
    'activity:read',
  ],
};

/** Usuarios de prueba, uno por cada rol del sistema */
const TEST_USERS = [
  { name: 'Super Admin', email: 'admin@inventario.com', password: 'Admin123!', roleName: 'SUPER_ADMIN' },
  { name: 'Carlos Administrador', email: 'carlos.admin@inventario.com', password: 'Admin123!', roleName: 'ADMIN' },
  { name: 'Laura Gerente', email: 'laura.manager@inventario.com', password: 'Manager123!', roleName: 'MANAGER' },
  { name: 'Pedro Usuario', email: 'pedro.user@inventario.com', password: 'User123!', roleName: 'USER' },
];

/** Categorías iniciales para clasificar productos */
const CATEGORIES = [
  'Electrónica', 'Periféricos', 'Mobiliario', 'Accesorios',
  'Almacenamiento', 'Software', 'Redes', 'Otros',
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // 1. Crear roles
    const roles = {};
    for (const roleData of ROLES_DATA) {
      const role = await Role.findOneAndUpdate(
        { name: roleData.name },
        roleData,
        { upsert: true, new: true },
      );
      roles[role.name] = role;
    }
    console.log(`${ROLES_DATA.length} roles creados/actualizados`);

    // 2. Crear permisos
    const permissions = {};
    for (const permData of PERMISSIONS_DATA) {
      const permission = await Permission.findOneAndUpdate(
        { resource: permData.resource, action: permData.action },
        permData,
        { upsert: true, new: true },
      );
      const key = `${permission.resource}:${permission.action}`;
      permissions[key] = permission;
    }
    console.log(`${PERMISSIONS_DATA.length} permisos creados/actualizados`);

    // 3. Crear mapeos rol-permiso
    let mappingsCreated = 0;
    for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS_MAP)) {
      const role = roles[roleName];

      for (const permKey of permissionKeys) {
        const permission = permissions[permKey];
        if (!permission) continue;

        await RolePermission.findOneAndUpdate(
          { role: role._id, permission: permission._id },
          { role: role._id, permission: permission._id },
          { upsert: true },
        );
        mappingsCreated++;
      }
    }
    console.log(`${mappingsCreated} mapeos rol-permiso creados/actualizados`);

    // 4. Crear usuarios de prueba (uno por cada rol)
    for (const testUser of TEST_USERS) {
      let user = await User.findOne({ email: testUser.email });
      if (!user) {
        user = await User.create({
          name: testUser.name,
          email: testUser.email,
          password: testUser.password,
          status: 'active',
        });
        console.log(`${testUser.roleName} creado: ${testUser.email} / ${testUser.password}`);
      } else {
        console.log(`Usuario ${testUser.email} ya existe, omitiendo...`);
      }

      // 5. Asignar rol correspondiente
      const role = roles[testUser.roleName];
      await UserRole.findOneAndUpdate(
        { user: user._id, role: role._id },
        { user: user._id, role: role._id },
        { upsert: true },
      );
    }
    console.log(`${TEST_USERS.length} usuarios de prueba con roles asignados`);

    // 6. Crear categorías
    for (const name of CATEGORIES) {
      await Category.findOneAndUpdate(
        { name },
        { name, active: true },
        { upsert: true },
      );
    }
    console.log(`${CATEGORIES.length} categorías creadas/actualizadas`);

    console.log('\nSeed completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('Error en seed:', error.message);
    process.exit(1);
  }
}

seed();
