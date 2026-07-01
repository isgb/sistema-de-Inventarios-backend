# Backend - Sistema de Inventarios Empresarial

API REST para gestión de inventarios empresariales con autenticación JWT, sistema RBAC desacoplado en base de datos y protección contra inyecciones NoSQL.

## Stack

| Dependencia | Propósito |
|---|---|
| express | Framework HTTP para la API REST |
| mongoose | ODM para modelar y consultar MongoDB |
| jsonwebtoken | Generación y verificación de access y refresh tokens |
| bcrypt | Hashing de contraseñas y refresh tokens (12 salt rounds) |
| dotenv | Carga de variables de entorno desde .env |
| helmet | Headers HTTP de seguridad (CSP, HSTS, X-Content-Type) |
| cors | Restricción de origen para peticiones del frontend |
| express-rate-limit | Límite de peticiones por IP para prevenir abuso |
| express-mongo-sanitize | Eliminación de operadores $ y . contra inyección NoSQL |
| express-validator | Validación y sanitización de datos de entrada |
| exceljs | Generar (.xlsx de exportación) y leer (.xlsx de importación) archivos Excel |
| multer | Recibir el archivo .xlsx subido en memoria (sin escribir a disco) |
| nodemon (dev) | Reinicio automático del servidor en desarrollo |

## Requisitos

- Node.js >= 18
- MongoDB >= 6

> Los movimientos de inventario usan transacciones MongoDB cuando hay replica set
> disponible (MongoDB Atlas lo tiene por defecto). En desarrollo local con MongoDB
> standalone, `movement.service.js` detecta esto automáticamente y ejecuta las
> mismas operaciones sin transacción, sin que el endpoint falle.

## Instalación y arranque

```bash
npm install
cp .env.example .env    # Editar con tus valores
npm run seed            # Crea roles, permisos, SUPER_ADMIN y categorías
npm run dev             # Desarrollo con hot-reload (puerto 5000)
```

## Scripts

| Script | Comando | Descripción |
|---|---|---|
| `npm run dev` | `nodemon src/server.js` | Servidor con hot-reload en puerto 5000 |
| `npm start` | `node src/server.js` | Servidor en producción |
| `npm run seed` | `node src/seed/seed.js` | Datos iniciales (idempotente, puede ejecutarse varias veces) |

## Variables de entorno

Documentadas en `.env.example`:

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `PORT` | `5000` | Puerto del servidor |
| `NODE_ENV` | `development` | development o production |
| `MONGODB_URI` | `mongodb://localhost:27017/inventario_empresarial` | URI de conexión a MongoDB |
| `JWT_SECRET` | - | Secreto para firmar access tokens (min 32 caracteres) |
| `JWT_EXPIRES_IN` | `15m` | Duración del access token |
| `JWT_REFRESH_SECRET` | - | Secreto para firmar refresh tokens (diferente al anterior) |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Duración del refresh token |
| `CORS_ORIGIN` | `http://localhost:5173` | URL del frontend permitida |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Ventana del rate limit en milisegundos (15 min) |
| `RATE_LIMIT_MAX` | `100` | Peticiones máximas por ventana por IP |

## Estructura del proyecto

```
src/
├── config/
│   └── db.js                  Conexión a MongoDB
├── controllers/               Reciben req/res, delegan al service
│   ├── activity.controller.js
│   ├── auth.controller.js
│   ├── category.controller.js
│   ├── movement.controller.js
│   ├── product.controller.js
│   ├── role.controller.js
│   └── user.controller.js
├── middleware/
│   ├── authenticate.js        Verifica JWT y adjunta req.user
│   ├── authorize.js           Verifica permisos RBAC desde DB con cache
│   ├── errorHandler.js        Manejo centralizado de todos los errores (incluye MulterError)
│   ├── upload.js              multer en memoria: solo .xlsx, máx 3MB, para importar productos
│   └── validate.js            Ejecuta reglas de express-validator
├── models/
│   ├── ActivityLog.js         Log de actividad compartido (quién hizo qué, para el dashboard)
│   ├── Category.js            Clasificación de productos
│   ├── InventoryMovement.js   Registro de entradas, salidas y ajustes de stock
│   ├── Permission.js          Acción permitida sobre un recurso (RBAC)
│   ├── Product.js             Artículo del inventario con stock y precio
│   ├── Role.js                Rol del sistema (SUPER_ADMIN, ADMIN, etc.)
│   ├── RolePermission.js      Mapeo N:N entre Role y Permission
│   ├── User.js                Perfil y credenciales (sin campo role)
│   └── UserRole.js            Mapeo N:N entre User y Role
├── routes/                    Definición de endpoints por recurso
│   ├── activity.routes.js
│   ├── auth.routes.js
│   ├── category.routes.js
│   ├── movement.routes.js
│   ├── product.routes.js
│   ├── role.routes.js
│   └── user.routes.js
├── services/                  Lógica de negocio (sin req/res)
│   ├── activity.service.js    Registrar y consultar actividad reciente
│   ├── auth.service.js        Registro, login, refresh, logout
│   ├── category.service.js    Listar (activas o todas), crear y actualizar categorías
│   ├── movement.service.js    Movimientos de stock paginados/filtrados, transacción con fallback
│   ├── permission.service.js  Consulta de permisos con cache en memoria
│   ├── product.service.js     CRUD paginado de productos, stats, import/export Excel
│   ├── role.service.js        Asignación y revocación de roles
│   └── user.service.js        CRUD paginado de usuarios con roles
├── validations/               Reglas de express-validator por entidad
│   ├── auth.validation.js
│   ├── category.validation.js
│   ├── movement.validation.js
│   ├── product.validation.js
│   ├── role.validation.js
│   └── user.validation.js
├── utils/
│   ├── AppError.js            Clase para errores operacionales con statusCode
│   ├── jwt.js                 Generación y verificación de access y refresh tokens
│   └── response.js            sendSuccess() para respuestas con formato unificado
├── seed/
│   └── seed.js                Roles, permisos, mapeos, admin y categorías
├── app.js                     Configuración de Express, seguridad y rutas
└── server.js                  Punto de entrada: conecta DB e inicia servidor
```

## Seed inicial

```bash
npm run seed
```

Crea los datos mínimos para que el sistema funcione:

- 4 roles: SUPER_ADMIN, ADMIN, MANAGER, USER
- 16 permisos: combinaciones de recurso + acción (incluye `activity:read`)
- 39 mapeos rol-permiso: qué permisos tiene cada rol
- 4 usuarios de prueba (uno por rol), ver tabla en [Usuarios de prueba](#usuarios-de-prueba)
- 8 categorías: Electrónica, Periféricos, Mobiliario, Accesorios, Almacenamiento, Software, Redes, Otros
- 10 productos de demostración (SKU con prefijo `SEED-`) con `isSeed: true`

El seed es idempotente: puede ejecutarse varias veces sin duplicar datos. Los usuarios y categorías del seed se marcan con `isSeed: true` en cada ejecución, aunque ya existan.

### Usuarios de prueba

| Rol | Email | Password |
|---|---|---|
| SUPER_ADMIN | `admin@inventario.com` | `Admin123!` |
| ADMIN | `carlos.admin@inventario.com` | `Admin123!` |
| MANAGER | `laura.manager@inventario.com` | `Manager123!` |
| USER | `pedro.user@inventario.com` | `User123!` |

## API REST

Base URL: `http://localhost:5000/api`

Todas las rutas protegidas requieren el header:

```
Authorization: Bearer <access_token>
```

### Formato de respuesta

Todas las respuestas usan el mismo formato:

Éxito:

```json
{
  "success": true,
  "message": "Descripción de la operación",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Descripción del error"
}
```

---

### Autenticación

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/auth/register` | Público | Registro de usuario (se asigna rol USER) |
| POST | `/auth/login` | Público | Inicio de sesión con email y password |
| POST | `/auth/refresh` | Público | Renovar access token con refresh token |
| POST | `/auth/logout` | Autenticado | Cerrar sesión (invalida refresh token) |

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
  "data": {
    "user": {
      "_id": "664f1a2b...",
      "name": "Super Admin",
      "email": "admin@inventario.com",
      "status": "active"
    },
    "roles": ["SUPER_ADMIN"],
    "token": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
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

Response `201`: mismo formato que login.

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
  "message": "Token renovado",
  "data": {
    "token": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

---

### Productos

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/products` | `products:read` | Listar paginado, con búsqueda/filtro/orden |
| GET | `/products/stats` | `products:read` | Estadísticas del inventario |
| GET | `/products/export` | `products:read` | Descargar inventario completo en `.xlsx` |
| POST | `/products/import/preview` | `products:create` | Subir `.xlsx`, validar sin guardar |
| POST | `/products/import/confirm` | `products:create` | Insertar en lote las filas validadas |
| GET | `/products/:id` | `products:read` | Detalle de un producto |
| POST | `/products` | `products:create` | Crear producto |
| PUT | `/products/:id` | `products:update` | Actualizar producto |
| DELETE | `/products/:id` | `products:delete` | Eliminar producto |

**Listar productos (paginado)** `GET /api/products`

Query params opcionales: `page` (default 1), `limit` (default 20, máx 100), `search` (nombre o SKU), `category` (ObjectId), `status` (`available`|`low`|`out`), `sort` (`name`|`sku`|`price`|`stock`|`createdAt`), `dir` (`asc`|`desc`).

Response `200`:

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [ { "_id": "...", "name": "...", "sku": "..." } ],
    "total": 87,
    "page": 1,
    "totalPages": 5
  }
}
```

Este mismo formato `{ items, total, page, totalPages }` lo usan también `GET /movements` y `GET /users`.

**Crear producto** `POST /api/products`

Request:

```json
{
  "name": "Laptop Dell Inspiron 15",
  "sku": "LAP-DELL-001",
  "category": "664f1a2b...",
  "price": 15999.99,
  "stock": 24,
  "minStock": 5,
  "description": "Laptop Dell con procesador Intel i7"
}
```

`category` es el ObjectId de una categoría existente (obtener vía `GET /categories`).

**Importar productos desde Excel**

Flujo en dos pasos:

1. `POST /api/products/import/preview` — multipart/form-data, campo `file` (`.xlsx`, máx 3MB, máx 500 filas). Columnas reconocidas (sin importar acentos/mayúsculas): `Nombre`, `SKU`, `Categoria`, `Precio`, `Stock`, `Stock Minimo`, `Descripcion`. Valida cada fila (campos obligatorios, categoría existente y activa, SKU no duplicado) **sin escribir en la base de datos** y responde `{ valid, errors, totalRows }`.
2. `POST /api/products/import/confirm` con `{ "rows": [...] }` (las filas `valid` devueltas por el preview) — vuelve a validar contra el estado actual de la DB e inserta en lote (`insertMany`). Responde `{ created, failed, errors }`.

**Exportar inventario** `GET /api/products/export` — descarga directa de un `.xlsx` con todos los productos (no pasa por el envoltorio `sendSuccess`, es un archivo binario).

**Estadísticas** `GET /api/products/stats`

Response `200`:

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "totalProducts": 8,
    "totalStock": 253,
    "totalValue": 724896.42,
    "lowStock": 2,
    "outOfStock": 1,
    "categories": 5
  }
}
```

Calculado con aggregation pipeline de MongoDB (no carga documentos en memoria).

---

### Usuarios

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/users` | `users:read` | Listar paginado (`page`, `limit`), con sus roles |
| GET | `/users/:id` | `users:read` | Detalle de un usuario con sus roles |
| POST | `/users` | `users:create` | Crear usuario con rol asignado |
| PUT | `/users/:id` | `users:update` | Actualizar nombre, email, contraseña o estado |

`GET /users` responde `{ items, total, page, totalPages }` (mismo formato que productos y movimientos).

**Crear usuario** `POST /api/users`

Request:

```json
{
  "name": "María López",
  "email": "maria@empresa.com",
  "password": "123456",
  "roleName": "MANAGER"
}
```

`roleName` es opcional (default: USER). El sistema valida que el creador tenga todos los permisos del rol que asigna.

**Actualizar usuario** `PUT /api/users/:id`

Request (todos los campos son opcionales, solo se actualizan los enviados):

```json
{
  "name": "María López García",
  "email": "maria.lopez@empresa.com",
  "password": "nuevoPassword123",
  "status": "active"
}
```

Response `200`:

```json
{
  "success": true,
  "message": "Usuario actualizado exitosamente",
  "data": {
    "_id": "664f1a2b...",
    "name": "María López García",
    "email": "maria.lopez@empresa.com",
    "status": "active",
    "roles": ["MANAGER"]
  }
}
```

`status` debe ser uno de: `active`, `inactive`, `blocked`. Si se envía `password`, se hashea automáticamente vía el hook `pre('save')` del modelo (la actualización usa `save()`, no `findByIdAndUpdate`, para que el hook se ejecute).

---

### Roles y permisos

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/roles` | `roles:read` | Listar roles activos |
| GET | `/roles/permissions` | `roles:read` | Listar todos los permisos del sistema |
| GET | `/roles/:roleId/permissions` | `roles:read` | Permisos de un rol específico |
| POST | `/roles/assign` | `users:assign-role` | Asignar rol a usuario |
| POST | `/roles/revoke` | `users:assign-role` | Revocar rol de usuario |

**Asignar rol** `POST /api/roles/assign`

Request:

```json
{
  "userId": "664f1a2b...",
  "roleId": "664f1a2b..."
}
```

---

### Categorías

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/categories` | `categories:read` | Listar categorías. Con `?all=true` incluye inactivas (gestión) |
| POST | `/categories` | `categories:create` | Crear categoría |
| PUT | `/categories/:id` | `categories:update` | Renombrar y/o activar/desactivar (`{ name?, active? }`) |

---

### Movimientos de inventario

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/movements` | `movements:read` | Listar paginado, con filtros |
| POST | `/movements` | `movements:create` | Crear movimiento (actualiza stock automáticamente) |

**Listar movimientos (paginado y filtrado)** `GET /api/movements`

Query params opcionales: `page`, `limit` (máx 100), `product` (ObjectId), `type` (`IN`|`OUT`|`ADJUSTMENT`), `startDate`, `endDate` (`YYYY-MM-DD`). Responde `{ items, total, page, totalPages }`.

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

Tipos: `IN` (suma al stock), `OUT` (resta del stock), `ADJUSTMENT` (establece stock al valor indicado).

Cada movimiento registra `previousStock` y `newStock` para auditoría.

---

### Actividad reciente

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/activity` | `activity:read` | Últimos 20 eventos de actividad, compartidos entre todos los usuarios |

`activity:read` lo tienen los 4 roles. Los eventos se registran automáticamente desde los services (crear/editar/eliminar producto, categoría, movimiento, usuario, asignar/revocar rol, importar Excel) — no hay un endpoint público para crearlos manualmente.

---

### Health check

```
GET /api/health
```

Response: `{ "status": "ok", "timestamp": "2026-06-29T..." }`

## Protección de datos de demo

Los registros creados por el seed llevan `isSeed: true` en su documento. El sistema aplica reglas especiales sobre ellos para mantener la demo estable en despliegue público:

| Colección | Protección |
|---|---|
| `products` | No se pueden eliminar (DELETE devuelve 403) |
| `categories` | No se pueden desactivar (`PUT { active: false }` devuelve 403) |
| `users` | No se pueden pasar a `inactive` ni `blocked` (PUT devuelve 403) |

Estas validaciones viven en los services (`product.service.remove`, `category.service.update`, `user.service.update`). El campo `isSeed` aparece en las respuestas de la API como referencia.

## Mantenimiento automático de MongoDB

### ActivityLog — TTL 90 días

`ActivityLog` tiene un índice TTL sobre `createdAt` con `expireAfterSeconds: 90 * 24 * 60 * 60`. MongoDB elimina automáticamente los registros con más de 90 días sin intervención manual.

### Movimientos — límite de 5 000 registros

`InventoryMovement` **no** tiene TTL (para no degradar métricas históricas del dashboard). En cambio, `movement.service.js` dispara `trimMovementsIfNeeded()` de forma asíncrona (fire-and-forget) después de cada creación: si el total supera `MAX_MOVEMENTS = 5000`, se eliminan los registros más antiguos. Un fallo del trim nunca cancela el movimiento principal.

## RBAC desacoplado

### Relaciones en base de datos

```
User <-- UserRole --> Role <-- RolePermission --> Permission
```

Los permisos NO están en el modelo User ni hardcodeados en código. Se almacenan en MongoDB y se cachean en memoria (TTL 5 minutos). Un usuario puede tener múltiples roles.

### Permisos por rol

| Permiso | SUPER_ADMIN | ADMIN | MANAGER | USER |
|---|:---:|:---:|:---:|:---:|
| users:read | si | si | | |
| users:create | si | si | | |
| users:update | si | si | | |
| users:delete | si | | | |
| users:assign-role | si | | | |
| products:read | si | si | si | si |
| products:create | si | si | | |
| products:update | si | si | | |
| products:delete | si | si | | |
| categories:read | si | si | si | si |
| categories:create | si | si | | |
| categories:update | si | si | | |
| movements:read | si | si | si | si |
| movements:create | si | si | si | |
| roles:read | si | si | | |
| activity:read | si | si | si | si |

### Protección contra elevación de privilegios

Para asignar un rol, el asignador debe tener TODOS los permisos del rol que quiere asignar. Si un ADMIN intenta asignar SUPER_ADMIN, se rechaza porque el ADMIN no tiene `users:delete` ni `users:assign-role`.

## Seguridad

| Protección | Implementación |
|---|---|
| Headers HTTP | helmet configura CSP, HSTS, X-Content-Type-Options, etc. |
| CORS | Restringido al origen definido en CORS_ORIGIN |
| Rate limiting global | 100 peticiones / 15 min por IP |
| Rate limiting login | 20 peticiones / 1 min por IP |
| Rate limiting crear usuario | 5 peticiones / 1 min por IP |
| Rate limiting crear producto | 20 peticiones / 1 min por IP |
| Rate limiting importar Excel | 2 peticiones / 1 min por IP (preview y confirm) |
| Bloqueo de cuenta | 5 intentos fallidos de login = bloqueo 15 minutos |
| Inyección NoSQL | express-mongo-sanitize elimina operadores $ y . del body |
| Validación de datos | express-validator en cada endpoint antes del controller |
| Hashing de contraseñas | bcrypt con 12 salt rounds vía hook pre-save de Mongoose |
| Hashing de refresh tokens | bcrypt con 10 salt rounds, almacenados en DB |
| Tokens JWT | Access token 15 min + Refresh token 7 días, secretos separados |
| Tamaño de body | Límite de 10 KB por petición JSON; el upload de Excel (multipart, fuera de `express.json()`) tiene su propio límite de 3MB vía `multer` |
| Campos sensibles | select: false en schema + toJSON() los elimina de las respuestas |
| Transacciones | Movimientos de inventario usan sesión MongoDB si hay replica set; fallback automático sin transacción en standalone |
| Stack traces | No se exponen en producción (solo en development) |

## Códigos HTTP

| Código | Significado en este proyecto |
|---|---|
| 200 | Operación exitosa |
| 201 | Recurso creado (registro, crear producto, asignar rol) |
| 400 | Datos inválidos o formato incorrecto |
| 401 | Token ausente, inválido o expirado |
| 403 | Sin permisos para la acción o cuenta desactivada |
| 404 | Recurso no encontrado |
| 409 | Conflicto: email, SKU o rol ya existe |
| 423 | Cuenta bloqueada por intentos fallidos de login |
| 429 | Rate limit excedido |
| 500 | Error interno del servidor |
