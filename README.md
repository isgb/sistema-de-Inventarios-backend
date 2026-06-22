# Backend — Sistema de Inventarios Empresarial

API REST para gestión de inventarios con autenticación JWT, control de acceso por roles (RBAC) y seguridad contra inyecciones.

## Stack

| Dependencia            | Propósito                                 |
|------------------------|-------------------------------------------|
| Express 4              | Framework HTTP                            |
| Mongoose 8             | ODM para MongoDB                          |
| jsonwebtoken 9         | Access tokens + refresh tokens            |
| bcrypt 5               | Hashing de contraseñas (12 salt rounds)   |
| helmet 8               | Headers HTTP seguros                      |
| cors 2                 | Restricción de origen                     |
| express-rate-limit 7   | Protección contra abuso                   |
| express-mongo-sanitize | Prevención de NoSQL injection             |
| express-validator 7    | Validación y sanitización de inputs       |
| nodemon (dev)          | Hot-reload en desarrollo                  |

## Requisitos

- Node.js >= 18
- MongoDB >= 6 (local o [Atlas](https://www.mongodb.com/atlas))

## Instalación y arranque

```bash
npm install
cp .env.example .env    # Editar con tus valores
npm run seed            # Crea SUPER_ADMIN + categorías
npm run dev             # Desarrollo con hot-reload (puerto 5000)
```

## Scripts disponibles

| Script          | Comando              | Descripción                           |
|-----------------|----------------------|---------------------------------------|
| `npm run dev`   | `nodemon src/server.js` | Servidor con hot-reload            |
| `npm start`     | `node src/server.js`    | Servidor en producción             |
| `npm run seed`  | `node src/seed/seed.js` | Crea usuario admin y categorías    |

## Variables de entorno

Documentadas en `.env.example`:

```env
PORT=5000                          # Puerto del servidor
NODE_ENV=development               # development | production
MONGODB_URI=mongodb://localhost:27017/inventario_empresarial
JWT_SECRET=<min 32 caracteres>     # Secreto para access tokens
JWT_EXPIRES_IN=15m                 # Duración del access token
JWT_REFRESH_SECRET=<diferente>     # Secreto para refresh tokens
JWT_REFRESH_EXPIRES_IN=7d          # Duración del refresh token
CORS_ORIGIN=http://localhost:5173  # Origen permitido (frontend)
RATE_LIMIT_WINDOW_MS=900000        # Ventana de rate limit (15 min)
RATE_LIMIT_MAX=100                 # Peticiones máximas por ventana
```

## Estructura del proyecto

```
src/
├── config/
│   ├── db.js               # Conexión a MongoDB
│   └── roles.js            # Roles, permisos y jerarquía RBAC
├── controllers/            # Reciben req/res, delegan al service
│   ├── auth.controller.js
│   ├── category.controller.js
│   ├── movement.controller.js
│   ├── product.controller.js
│   └── user.controller.js
├── middleware/
│   ├── authenticate.js     # Verifica JWT en Authorization header
│   ├── authorize.js        # Verifica permisos del rol (RBAC)
│   ├── errorHandler.js     # Manejo centralizado de errores
│   └── validate.js         # Ejecuta express-validator y retorna 400
├── models/                 # Schemas de Mongoose
│   ├── User.js
│   ├── Product.js
│   ├── Category.js
│   └── InventoryMovement.js
├── routes/                 # Definición de endpoints por recurso
│   ├── auth.routes.js
│   ├── category.routes.js
│   ├── movement.routes.js
│   ├── product.routes.js
│   └── user.routes.js
├── services/               # Lógica de negocio (sin req/res)
│   ├── auth.service.js
│   ├── category.service.js
│   ├── movement.service.js
│   ├── product.service.js
│   └── user.service.js
├── validations/            # Reglas de express-validator por entidad
│   ├── auth.validation.js
│   ├── movement.validation.js
│   ├── product.validation.js
│   └── user.validation.js
├── utils/
│   ├── AppError.js         # Clase para errores operacionales
│   ├── jwt.js              # Generación y verificación de tokens
│   └── response.js         # Helpers para respuestas consistentes
├── seed/
│   └── seed.js             # Datos iniciales (admin + categorías)
├── app.js                  # Configuración de Express y middleware
└── server.js               # Entry point: conecta DB e inicia server
```

## Seed inicial

```bash
npm run seed
```

Crea:
- Un usuario **SUPER_ADMIN** (`admin@inventario.com` / `Admin123!`)
- 8 categorías: Electrónica, Periféricos, Mobiliario, Accesorios, Almacenamiento, Software, Redes, Otros

El seed es idempotente — si el admin o las categorías ya existen, no los duplica.

## API REST

Base URL: `http://localhost:5000/api`

### Autenticación

```
POST   /auth/register    Registro público
POST   /auth/login       Iniciar sesión
POST   /auth/refresh     Renovar access token
POST   /auth/logout      Cerrar sesión (requiere token)
```

**Login** — `POST /api/auth/login`

```json
// Request
{ "email": "admin@inventario.com", "password": "Admin123!" }

// Response 200
{
  "success": true,
  "message": "Login exitoso",
  "user": { "_id": "...", "name": "Super Admin", "email": "admin@inventario.com", "role": "SUPER_ADMIN" },
  "token": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

**Register** — `POST /api/auth/register`

```json
// Request
{ "name": "Nuevo Usuario", "email": "nuevo@correo.com", "password": "123456" }

// Response 201
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "user": { "_id": "...", "name": "Nuevo Usuario", "email": "nuevo@correo.com", "role": "USER" },
  "token": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

**Refresh** — `POST /api/auth/refresh`

```json
// Request
{ "refreshToken": "eyJhbG..." }

// Response 200
{ "success": true, "token": "eyJhbG...", "refreshToken": "eyJhbG..." }
```

### Productos

Todas las rutas requieren `Authorization: Bearer <token>`.

```
GET    /products         Listar todos           (cualquier rol)
GET    /products/stats   Estadísticas dashboard  (cualquier rol)
GET    /products/:id     Detalle de un producto  (cualquier rol)
POST   /products         Crear producto          (ADMIN+)
PUT    /products/:id     Actualizar producto     (ADMIN+)
DELETE /products/:id     Eliminar producto       (ADMIN+)
```

**Crear producto** — `POST /api/products`

```json
// Request
{
  "name": "Laptop Dell Inspiron 15",
  "sku": "LAP-DELL-001",
  "category": "Electrónica",
  "price": 15999.99,
  "stock": 24,
  "minStock": 5,
  "description": "Laptop Dell con procesador Intel i7"
}

// Response 201
{
  "_id": "...",
  "name": "Laptop Dell Inspiron 15",
  "sku": "LAP-DELL-001",
  "category": "Electrónica",
  "price": 15999.99,
  "stock": 24,
  "minStock": 5,
  "description": "Laptop Dell con procesador Intel i7",
  "createdBy": "...",
  "createdAt": "2026-06-21T...",
  "updatedAt": "2026-06-21T..."
}
```

**Estadísticas** — `GET /api/products/stats`

```json
// Response 200
{
  "totalProducts": 8,
  "totalStock": 253,
  "totalValue": 724896.42,
  "lowStock": 2,
  "outOfStock": 1,
  "categories": 5
}
```

### Usuarios

```
GET    /users            Listar usuarios   (ADMIN, SUPER_ADMIN)
POST   /users            Crear usuario     (ADMIN, SUPER_ADMIN)
```

**Crear usuario** — `POST /api/users`

```json
// Request
{ "name": "María López", "email": "maria@empresa.com", "password": "123456", "role": "MANAGER" }

// Response 201
{ "success": true, "message": "Usuario creado exitosamente", "data": { ... } }
```

### Categorías

```
GET    /categories       Listar activas     (cualquier rol)
POST   /categories       Crear categoría    (ADMIN+)
```

### Movimientos de inventario

```
GET    /movements        Listar todos       (cualquier rol)
POST   /movements        Crear movimiento   (MANAGER+)
```

**Crear movimiento** — `POST /api/movements`

```json
// Request
{ "product": "<product_id>", "type": "IN", "quantity": 50, "reason": "Compra a proveedor" }

// Response 201 — también actualiza el stock del producto automáticamente
```

Tipos de movimiento: `IN` (entrada), `OUT` (salida), `ADJUSTMENT` (ajuste a cantidad exacta).

### Health check

```
GET    /api/health       → { "status": "ok", "timestamp": "..." }
```

### Formato de respuestas de error

```json
{ "success": false, "message": "Descripción del error" }
```

Códigos HTTP usados: `400` (validación), `401` (no autenticado), `403` (sin permisos), `404` (no encontrado), `409` (duplicado), `423` (cuenta bloqueada), `429` (rate limit), `500` (error interno).

## Roles y permisos (RBAC)

Jerarquía: `SUPER_ADMIN > ADMIN > MANAGER > USER`

| Permiso            | SUPER_ADMIN | ADMIN | MANAGER | USER |
|--------------------|:-----------:|:-----:|:-------:|:----:|
| users:read         |      x      |   x   |         |      |
| users:create       |      x      |   x   |         |      |
| users:assign-role  |      x      |       |         |      |
| products:read      |      x      |   x   |    x    |  x   |
| products:create    |      x      |   x   |         |      |
| products:update    |      x      |   x   |         |      |
| products:delete    |      x      |   x   |         |      |
| categories:read    |      x      |   x   |    x    |  x   |
| categories:create  |      x      |   x   |         |      |
| movements:read     |      x      |   x   |    x    |  x   |
| movements:create   |      x      |   x   |    x    |      |

**Protección contra elevación de privilegios:** Un ADMIN solo puede asignar roles inferiores al suyo (MANAGER, USER). Nadie puede auto-asignarse SUPER_ADMIN.

## Seguridad

| Capa                 | Implementación                                              |
|----------------------|-------------------------------------------------------------|
| Headers HTTP         | Helmet (X-Content-Type-Options, CSP, HSTS, etc.)           |
| CORS                 | Restringido a `CORS_ORIGIN` del .env                       |
| Rate limiting global | 100 req / 15 min por IP                                    |
| Rate limiting login  | 10 req / 15 min por IP                                     |
| Bloqueo de cuenta    | 5 intentos fallidos = bloqueo 15 minutos                   |
| NoSQL injection      | express-mongo-sanitize en todas las peticiones              |
| Validación de input  | express-validator en cada endpoint con body/params          |
| Hashing              | bcrypt con 12 salt rounds (contraseñas y refresh tokens)    |
| JWT                  | Access token 15 min + Refresh token 7 días, secretos separados |
| Body size            | Límite de 10 KB por petición                               |
| Campos sensibles     | `password`, `refreshToken`, `loginAttempts` excluidos con `select: false` y `toJSON()` |
| Errores              | Sin stack traces en producción                              |

## Conectar con el frontend

El frontend (React + Vite) ya está configurado para consumir `http://localhost:5000/api`. Para activar la conexión real:

1. En `frontend/src/services/auth.service.js`, cambiar `USE_MOCK = true` a `USE_MOCK = false`
2. En `frontend/src/services/product.service.js`, cambiar `USE_MOCK = true` a `USE_MOCK = false`
3. Ejecutar backend (`npm run dev`) y frontend (`cd ../frontend && npm run dev`) en paralelo
#   s i s t e m a - d e - I n v e n t a r i o s - b a c k e n d  
 #   s i s t e m a - d e - I n v e n t a r i o s - b a c k e n d  
 