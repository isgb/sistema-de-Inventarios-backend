require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const { ROLES } = require('../config/roles');

const CATEGORIES = [
  'Electrónica',
  'Periféricos',
  'Mobiliario',
  'Accesorios',
  'Almacenamiento',
  'Software',
  'Redes',
  'Otros',
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Crear SUPER_ADMIN si no existe
    const existingAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN });
    if (!existingAdmin) {
      await User.create({
        name: 'Super Admin',
        email: 'admin@inventario.com',
        password: 'Admin123!',
        role: ROLES.SUPER_ADMIN,
        status: 'active',
      });
      console.log('SUPER_ADMIN creado: admin@inventario.com / Admin123!');
    } else {
      console.log('SUPER_ADMIN ya existe, omitiendo...');
    }

    // Crear categorías
    for (const name of CATEGORIES) {
      await Category.findOneAndUpdate(
        { name },
        { name, active: true },
        { upsert: true },
      );
    }
    console.log(`${CATEGORIES.length} categorías creadas/actualizadas`);

    console.log('Seed completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('Error en seed:', error.message);
    process.exit(1);
  }
}

seed();
