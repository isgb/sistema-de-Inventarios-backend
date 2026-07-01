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
const Product = require('../models/Product');

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

/**
 * Productos de demostración — protegidos con isSeed: true para
 * que no puedan eliminarse desde la UI pública.
 * La propiedad categoryName se resuelve a un ObjectId durante el seed.
 */
const SEED_PRODUCTS = [
  { name: 'Laptop Dell XPS 15', sku: 'SEED-DELL-XPS15', categoryName: 'Electrónica', price: 25000, stock: 12, minStock: 3, description: 'Laptop de alto rendimiento para profesionales' },
  { name: 'Monitor LG UltraWide 27"', sku: 'SEED-LG-MON27', categoryName: 'Periféricos', price: 6500, stock: 8, minStock: 2, description: 'Monitor Full HD con panel IPS' },
  { name: 'Teclado Mecánico RGB', sku: 'SEED-KB-MECH', categoryName: 'Periféricos', price: 1200, stock: 25, minStock: 5, description: 'Teclado mecánico retroiluminado para oficina' },
  { name: 'Silla Ergonómica Pro', sku: 'SEED-SILLA-ERG', categoryName: 'Mobiliario', price: 4800, stock: 6, minStock: 2, description: 'Silla de oficina con soporte lumbar ajustable' },
  { name: 'Disco SSD NVMe 1TB', sku: 'SEED-SSD-1TB', categoryName: 'Almacenamiento', price: 2200, stock: 15, minStock: 4, description: 'SSD NVMe de alta velocidad, lectura 3500 MB/s' },
  { name: 'Switch 24 Puertos Gigabit', sku: 'SEED-SW-24P', categoryName: 'Redes', price: 3500, stock: 4, minStock: 2, description: 'Switch administrable Layer 2 para rack' },
  { name: 'Mouse Inalámbrico Ergonómico', sku: 'SEED-MOUSE-WL', categoryName: 'Accesorios', price: 450, stock: 30, minStock: 8, description: 'Mouse vertical inalámbrico, 2.4GHz' },
  { name: 'Office 365 Business Basic', sku: 'SEED-OFF365', categoryName: 'Software', price: 1800, stock: 10, minStock: 2, description: 'Licencia anual Microsoft 365 por usuario' },
  { name: 'Headset USB Noise Cancelling', sku: 'SEED-HEADSET-USB', categoryName: 'Accesorios', price: 980, stock: 18, minStock: 4, description: 'Auriculares con cancelación de ruido activa' },
  { name: 'Laptop Lenovo ThinkPad E14', sku: 'SEED-LENOVO-E14', categoryName: 'Electrónica', price: 18500, stock: 0, minStock: 2, description: 'Laptop empresarial ultraportátil (sin stock)' },
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
    let adminUserId = null;
    for (const testUser of TEST_USERS) {
      let user = await User.findOne({ email: testUser.email });
      if (!user) {
        user = await User.create({
          name: testUser.name,
          email: testUser.email,
          password: testUser.password,
          status: 'active',
          isSeed: true,
        });
        console.log(`${testUser.roleName} creado: ${testUser.email} / ${testUser.password}`);
      } else {
        // Marcar como isSeed aunque ya exista
        await User.findByIdAndUpdate(user._id, { isSeed: true });
        console.log(`Usuario ${testUser.email} ya existe, marcado como isSeed`);
      }

      if (testUser.roleName === 'SUPER_ADMIN') adminUserId = user._id;

      // 5. Asignar rol correspondiente
      const role = roles[testUser.roleName];
      await UserRole.findOneAndUpdate(
        { user: user._id, role: role._id },
        { user: user._id, role: role._id },
        { upsert: true },
      );
    }
    console.log(`${TEST_USERS.length} usuarios de prueba con roles asignados`);

    // 6. Crear categorías con isSeed: true
    const categoryDocs = {};
    for (const name of CATEGORIES) {
      const category = await Category.findOneAndUpdate(
        { name },
        { name, active: true, isSeed: true },
        { upsert: true, new: true },
      );
      categoryDocs[name] = category;
    }
    console.log(`${CATEGORIES.length} categorías creadas/actualizadas`);

    // 7. Crear productos de demostración con isSeed: true
    let productsCreated = 0;
    for (const seedProduct of SEED_PRODUCTS) {
      const category = categoryDocs[seedProduct.categoryName];
      if (!category) continue;

      await Product.findOneAndUpdate(
        { sku: seedProduct.sku },
        {
          name: seedProduct.name,
          sku: seedProduct.sku,
          category: category._id,
          price: seedProduct.price,
          stock: seedProduct.stock,
          minStock: seedProduct.minStock,
          description: seedProduct.description,
          createdBy: adminUserId,
          isSeed: true,
        },
        { upsert: true, new: true },
      );
      productsCreated++;
    }
    console.log(`${productsCreated} productos de demo creados/actualizados`);

    console.log('\nSeed completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('Error en seed:', error.message);
    process.exit(1);
  }
}

seed();
