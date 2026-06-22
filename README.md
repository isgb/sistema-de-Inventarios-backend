# Backend - Sistema de Inventarios Empresarial

API REST para gestión de inventarios con autenticación JWT, control de acceso por roles (RBAC) y seguridad contra inyecciones.

## Stack

| Dependencia | Propósito |
|---|---|
| Express 4 | Framework HTTP |
| Mongoose 8 | ODM para MongoDB |
| jsonwebtoken 9 | Access tokens + refresh tokens |
| bcrypt 5 | Hashing de contraseñas (12 salt rounds) |
| helmet 8 | Headers HTTP seguros |
| cors 2 | Restricción de origen |
| express-rate-limit 7 | Protección contra abuso |
| express-mongo-sanitize | Prevención de NoSQL injection |
| express-validator 7 | Validación y sanitización de inputs |
| nodemon (dev) | Hot-reload en desarrollo |

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

| Script | Comando | Descripción |
|---|---|---|
| `npm run dev` | `nodemon src/server.js` | Servidor con hot-reload |
| `npm start` | `node src/server.js` | Servidor en producción |
| `npm run seed` | `node src/seed/seed.js` | Crea usuario admin y categorías |

## Variables de entorno

Documentadas en `.env.example`:

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `PORT` | `5000` | Puerto del servidor |
| `NODE_ENV` | `development` | Entorno: development o production |
| `MONGODB_URI` | `mongodb://localhost:27017/inventario_empresarial` | URI de conexión a MongoDB |
| `JWT_SECRET` | - | Secreto para access tokens (min 32 caracteres) |
| `JWT_EXPIRES_IN` | `15m` | Duración del access token |
| `JWT_REFRESH_SECRET` | - | Secreto para refresh tokens (diferente al anterior) |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Duración del refresh token |
| `CORS_ORIGIN` | `http://localhost:5173` | Origen permitido (frontend) |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Ventana de rate limit en ms (15 min) |
| `RATE_LIMIT_MAX` | `100` | Peticiones máximas por ventana |

## Estructura del proyecto

```
src/
├── config/
│   ├── db.js                  Conexión a MongoDB
│   └── roles.js               Roles, permisos y jerarquía RBAC
├── controllers/               Reciben req/res, delegan al service
│   ├── auth.controller.js
│   ├── category.controller.js
│   ├── movement.controller.js
│   ├── product.controller.js
│   └── user.controller.js
├── middleware/
│   ├── authenticate.js        Verifica JWT en Authorization header
│   ├── authorize.js           Verifica permisos del rol (RBAC)
│   ├── errorHandler.js        Manejo centralizado de errores
│   └── validate.js            Ejecuta express-validator y retorna 400
├── models/                    Schemas de Mongoose
│   ├── User.js
│   ├── Product.js
│   ├── Category.js
│   └── InventoryMovement.js
├── routes/                    Definición de endpoints por recurso
│   ├── auth.routes.js
│   ├── category.routes.js
│   ├── movement.routes.js
│   ├── product.routes.js
│   └── user.routes.js
├── services/                  Lógica de negocio (sin req/res)
│   ├── auth.service.js
│   ├── category.service.js
│   ├── movement.service.js
│   ├── product.service.js
│   └── user.service.js
├── validations/               Reglas de express-validator por entidad
│   ├── auth.validation.js
│   ├── movement.validation.js
│   ├── product.validation.js
│   └── user.validation.js
├── utils/
│   ├── AppError.js            Clase para errores operacionales
│   ├── jwt.js                 Generación y verificación de tokens
│   └── response.js            Helpers para respuestas consistentes
├── seed/
│   └── seed.js                Datos iniciales (admin + categorías)
├── app.js                     Configuración de Express y middleware
└── server.js                  Entry point: conecta DB e inicia server
```

## Seed inicial

```bash
npm run seed
```

Crea:

- Un usuario **SUPER_ADMIN** con email `admin@inventario.com` y password `Admin123!`
- 8 categorías: Electrónica, Periféricos, Mobiliario, Accesorios, Almacenamiento, Software, Redes, Otros

El seed es idempotente: si el admin o las categorías ya existen, no los duplica.

## API REST

Base URL: `http://localhost:5000/api`

Todas las rutas protegidas requieren el header:

```
Authorization: Bearer <access_token>
```

---

### Autenticación

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| POST | `/auth/register` | Registro público | Público |
| POST | `/auth/login` | Iniciar sesión | Público |
| POST | `/auth/refresh` | Renovar access token | Público |
| POST | `/auth/logout` | Cerrar sesión | Autenticado |

**Login** `POST /api/auth/login`

Request:

```json
{
  "email": "admin@inventario.com",
  "password": "Admin123!"
}
```

Response `200`:

```json
{
  "success": true,
  "message": "Login exitoso",
  "user": {
    "_id": "664f1a2b...",
    "name": "Super Admin",
    "email": "admin@inventario.com",
    "role": "SUPER_ADMIN"
  },
  "token": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi..."
}
```

**Register** `POST /api/auth/register`

Request:

```json
{
  "name": "Nuevo Usuario",
  "email": "nuevo@correo.com",
  "password": "123456"
}
```

Response `201`:

```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "user": {
    "_id": "664f1a2b...",
    "name": "Nuevo Usuario",
    "email": "nuevo@correo.com",
    "role": "USER"
  },
  "token": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi..."
}
```

**Refresh** `POST /api/auth/refresh`

Request:

```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

Response `200`:

```json
{
  "success": true,
  "token": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi..."
}
```

---

### Productos

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/products` | Listar todos | Cualquier rol |
| GET | `/products/stats` | Estadísticas del dashboard | Cualquier rol |
| GET | `/products/:id` | Detalle de un producto | Cualquier rol |
| POST | `/products` | Crear producto | ADMIN+ |
| PUT | `/products/:id` | Actualizar producto | ADMIN+ |
| DELETE | `/products/:id` | Eliminar producto | ADMIN+ |

**Crear producto** `POST /api/products`

Request:

```json
{
  "name": "Laptop Dell Inspiron 15",
  "sku": "LAP-DELL-001",
  "category": "Electrónica",
  "price": 15999.99,
  "stock": 24,
  "minStock": 5,
  "description": "Laptop Dell con procesador Intel i7"
}
```

Response `201`:

```json
{
  "_id": "664f1a2b...",
  "name": "Laptop Dell Inspiron 15",
  "sku": "LAP-DELL-001",
  "category": "Electrónica",
  "price": 15999.99,
  "stock": 24,
  "minStock": 5,
  "description": "Laptop Dell con procesador Intel i7",
  "createdBy": "664f1a2b...",
  "createdAt": "2026-06-21T00:00:00.000Z",
  "updatedAt": "2026-06-21T00:00:00.000Z"
}
```

**Estadísticas** `GET /api/products/stats`

Response `200`:

```json
{
  "totalProducts": 8,
  "totalStock": 253,
  "totalValue": 724896.42,
  "lowStock": 2,
  "outOfStock": 1,
  "categories": 5
}
```

---

### Usuarios

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/users` | Listar usuarios | ADMIN, SUPER_ADMIN |
| POST | `/users` | Crear usuario | ADMIN, SUPER_ADMIN |

**Crear usuario** `POST /api/users`

Request:

```json
{
  "name": "María López",
  "email": "maria@empresa.com",
  "password": "123456",
  "role": "MANAGER"
}
```

Response `201`:

```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "data": {
    "_id": "664f1a2b...",
    "name": "María López",
    "email": "maria@empresa.com",
    "role": "MANAGER",
    "status": "active"
  }
}
```

---

### Categorías

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/categories` | Listar categorías activas | Cualquier rol |
| POST | `/categories` | Crear categoría | ADMIN+ |

---

### Movimientos de inventario

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/movements` | Listar todos | Cualquier rol |
| POST | `/movements` | Crear movimiento | MANAGER+ |

**Crear movimiento** `POST /api/movements`

Request:

```json
{
  "product": "664f1a2b...",
  "type": "IN",
  "quantity": 50,
  "reason": "Compra a proveedor"
}
```

Tipos de movimiento:

- `IN` - Entrada de stock
- `OUT` - Salida de stock
- `ADJUSTMENT` - Ajuste a cantidad exacta

> El stock del producto se actualiza automáticamente al crear el movimiento.

---

### Health check

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del servidor |

Response `200`:

```json
{
  "status": "ok",
  "timestamp": "2026-06-21T00:00:00.000Z"
}
```

---

### Formato de errores

Todas las respuestas de error siguen este formato:

```json
{
  "success": false,
  "message": "Descripción del error"
}
```

| Código | Significado |
|---|---|
| 400 | Validación fallida o datos incorrectos |
| 401 | Token faltante, inválido o expirado |
| 403 | Sin permisos (RBAC) o cuenta desactivada |
| 404 | Recurso no encontrado |
| 409 | Conflicto (email o SKU duplicado) |
| 423 | Cuenta bloqueada por intentos fallidos |
| 429 | Rate limit excedido |
| 500 | Error interno no controlado |

## Roles y permisos (RBAC)

Jerarquía: **SUPER_ADMIN > ADMIN > MANAGER > USER**

| Permiso | SUPER_ADMIN | ADMIN | MANAGER | USER |
|---|:---:|:---:|:---:|:---:|
| users:read | si | si | | |
| users:create | si | si | | |
| users:assign-role | si | | | |
| products:read | si | si | si | si |
| products:create | si | si | | |
| products:update | si | si | | |
| products:delete | si | si | | |
| categories:read | si | si | si | si |
| categories:create | si | si | | |
| movements:read | si | si | si | si |
| movements:create | si | si | si | |

> **Protección contra elevación de privilegios:** Un ADMIN solo puede asignar roles inferiores al suyo (MANAGER, USER). Nadie puede auto-asignarse SUPER_ADMIN.

## Seguridad

| Capa | Implementación |
|---|---|
| Headers HTTP | Helmet (X-Content-Type-Options, CSP, HSTS, etc.) |
| CORS | Restringido al origen definido en CORS_ORIGIN |
| Rate limiting global | 100 peticiones / 15 minutos por IP |
| Rate limiting login | 10 peticiones / 15 minutos por IP |
| Bloqueo de cuenta | 5 intentos fallidos = bloqueo 15 minutos |
| NoSQL injection | express-mongo-sanitize en todas las peticiones |
| Validación de input | express-validator en cada endpoint con body y params |
| Hashing | bcrypt con 12 salt rounds para contraseñas y refresh tokens |
| JWT | Access token 15 min + Refresh token 7 días con secretos separados |
| Body size | Límite de 10 KB por petición |
| Campos sensibles | password, refreshToken, loginAttempts excluidos con select false y toJSON |
| Errores | Sin stack traces en producción |

## Conectar con el frontend

El frontend (React + Vite) ya está configurado para consumir `http://localhost:5000/api`. Para activar la conexión real:

1. En `frontend/src/services/auth.service.js`, cambiar `USE_MOCK = true` a `USE_MOCK = false`
2. En `frontend/src/services/product.service.js`, cambiar `USE_MOCK = true` a `USE_MOCK = false`
3. Ejecutar backend (`npm run dev`) y frontend (`cd ../frontend && npm run dev`) en paralelo
