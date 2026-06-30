# Documentacion tecnica - Backend Sistema de Inventarios

Documentacion detallada de la arquitectura, decisiones de diseno y flujos internos del backend.

## Indice

1. [Arquitectura general](#1-arquitectura-general)
2. [Base de datos MongoDB](#2-base-de-datos-mongodb)
3. [Sistema RBAC](#3-sistema-rbac)
4. [Autenticacion JWT](#4-autenticacion-jwt)
5. [Capa de servicios](#5-capa-de-servicios)
6. [Middleware](#6-middleware)
7. [Validaciones](#7-validaciones)
8. [Manejo de errores](#8-manejo-de-errores)
9. [Seguridad](#9-seguridad)
10. [Seed y datos iniciales](#10-seed-y-datos-iniciales)
11. [Endpoints de la API](#11-endpoints-de-la-api)
12. [Documentacion del codigo](#12-documentacion-del-codigo)
13. [Scripts disponibles](#13-scripts-disponibles)

---

## 1. Arquitectura general

### Patron por capas

```
Cliente HTTP
    |
    v
  Route          Define el endpoint y encadena middleware
    |
    v
  Validation     express-validator verifica formato de datos
    |
    v
  authenticate   Verifica JWT, adjunta req.user
    |
    v
  authorize      Consulta permisos desde DB (con cache)
    |
    v
  Controller     Extrae datos de req, delega al service, responde
    |
    v
  Service        Logica de negocio pura (sin req/res)
    |
    v
  Model          Schema de Mongoose, validacion de datos, hooks
    |
    v
  MongoDB
```

### Principios de diseno

- **Separacion de responsabilidades**: cada capa tiene una unica funcion.
- **Desacoplamiento**: el RBAC es independiente del modelo User.
- **Datos normalizados**: relaciones via ObjectId, no strings duplicados.
- **Codigo pragmatico**: nivel junior-mid, sin sobreingenieria.
- **Funciones cortas**: maximo 40-50 lineas por funcion.
- **Nesting controlado**: maximo 3 niveles de anidamiento.

### Estructura del proyecto

```
src/
├── config/
│   └── db.js                  Conexion a MongoDB
├── controllers/               Reciben req/res, delegan al service
│   ├── auth.controller.js     Registro, login, refresh, logout
│   ├── category.controller.js Listar y crear categorias
│   ├── movement.controller.js Listar y crear movimientos de stock
│   ├── product.controller.js  CRUD de productos y estadisticas
│   ├── role.controller.js     Gestion de roles y permisos RBAC
│   └── user.controller.js     Listar y crear usuarios
├── middleware/
│   ├── authenticate.js        Verifica JWT y adjunta req.user
│   ├── authorize.js           Verifica permisos RBAC desde DB con cache
│   ├── errorHandler.js        Manejo centralizado de todos los errores
│   └── validate.js            Ejecuta reglas de express-validator
├── models/
│   ├── Category.js            Clasificacion de productos
│   ├── InventoryMovement.js   Registro de entradas, salidas y ajustes
│   ├── Permission.js          Accion permitida sobre un recurso (RBAC)
│   ├── Product.js             Articulo del inventario con stock y precio
│   ├── Role.js                Rol del sistema (SUPER_ADMIN, ADMIN, etc.)
│   ├── RolePermission.js      Mapeo N:N entre Role y Permission
│   ├── User.js                Perfil y credenciales (sin campo role)
│   └── UserRole.js            Mapeo N:N entre User y Role
├── routes/
│   ├── auth.routes.js         Rutas publicas de autenticacion
│   ├── category.routes.js     Rutas protegidas de categorias
│   ├── movement.routes.js     Rutas protegidas de movimientos
│   ├── product.routes.js      Rutas protegidas de productos
│   ├── role.routes.js         Rutas de gestion RBAC
│   └── user.routes.js         Rutas protegidas de usuarios
├── services/
│   ├── auth.service.js        Registro, login, refresh, logout
│   ├── category.service.js    Listar y crear categorias
│   ├── movement.service.js    Movimientos de stock con transaccion
│   ├── permission.service.js  Consulta de permisos con cache en memoria
│   ├── product.service.js     CRUD de productos, stats con aggregation
│   ├── role.service.js        Asignacion y revocacion de roles
│   └── user.service.js        Gestion de usuarios con roles
├── validations/
│   ├── auth.validation.js     Registro, login, refresh
│   ├── movement.validation.js Crear movimiento
│   ├── product.validation.js  Crear y actualizar producto, validar ID
│   ├── role.validation.js     Asignar y revocar rol, validar roleId
│   └── user.validation.js     Crear usuario
├── utils/
│   ├── AppError.js            Clase de error con statusCode
│   ├── jwt.js                 Generacion y verificacion de tokens
│   └── response.js            sendSuccess() para respuestas unificadas
├── seed/
│   └── seed.js                Roles, permisos, mapeos, admin, categorias
├── app.js                     Configuracion de Express, seguridad y rutas
└── server.js                  Punto de entrada: conecta DB e inicia servidor
```

### Dependencias

| Paquete | Para que sirve |
|---|---|
| express | Framework web para crear la API REST |
| mongoose | Conectar y modelar datos en MongoDB |
| jsonwebtoken | Crear y verificar access y refresh tokens JWT |
| bcrypt | Hashear contrasenas (12 rounds) y refresh tokens (10 rounds) |
| dotenv | Cargar variables de entorno desde .env |
| cors | Permitir peticiones desde el frontend configurado en CORS_ORIGIN |
| helmet | Agregar cabeceras de seguridad HTTP (CSP, HSTS, etc.) |
| express-rate-limit | Limitar peticiones por IP (global y login) |
| express-validator | Validar y sanitizar datos de entrada en las peticiones |
| express-mongo-sanitize | Eliminar operadores $ y . para prevenir inyeccion NoSQL |
| nodemon (dev) | Reiniciar el servidor automaticamente al guardar cambios |

---

## 2. Base de datos MongoDB

### Diagrama de colecciones

```
┌─────────┐     ┌──────────┐     ┌──────┐     ┌────────────────┐     ┌────────────┐
│  User   │<----│ UserRole │---->│ Role │<----│ RolePermission │---->│ Permission │
└────┬────┘     └──────────┘     └──────┘     └────────────────┘     └────────────┘
     │
     │ createdBy
     v
┌─────────┐     ┌──────────┐
│ Product │---->│ Category │
└────┬────┘     └──────────┘
     │
     │ product
     v
┌───────────────────┐
│ InventoryMovement │
└───────────────────┘
```

### Colecciones de negocio

**users**

| Campo | Tipo | Detalles |
|---|---|---|
| name | String | Requerido, max 100 caracteres |
| email | String | Unico, se guarda en minusculas |
| password | String | select: false, hasheado con bcrypt 12 rounds via hook pre-save |
| status | String | active, inactive o blocked. Default: active |
| loginAttempts | Number | select: false. Contador de intentos fallidos consecutivos |
| lockUntil | Date | select: false. Fecha limite del bloqueo temporal |
| refreshToken | String | select: false. Hash bcrypt del refresh token activo |

No tiene campo `role`. Los roles se obtienen de la coleccion `userroles`.

Indice: `{ status: 1 }`

**products**

| Campo | Tipo | Detalles |
|---|---|---|
| name | String | Requerido, max 200 caracteres |
| sku | String | Unico, se guarda en mayusculas |
| description | String | Opcional, max 1000 caracteres |
| category | ObjectId -> Category | Referencia a la coleccion categories |
| stock | Number | Min 0, default 0. Se actualiza via movimientos |
| minStock | Number | Min 0, default 0. Umbral de alerta de stock bajo |
| price | Number | Requerido, min 0 |
| createdBy | ObjectId -> User | Usuario que registro el producto |

Indices: `{ category: 1 }`, `{ createdBy: 1 }`, `{ stock: 1, minStock: 1 }`

**categories**

| Campo | Tipo | Detalles |
|---|---|---|
| name | String | Unico, max 100 caracteres |
| active | Boolean | Default true. Soporta soft-delete |

Indice: `{ name: 1, active: 1 }`

**inventorymovements**

| Campo | Tipo | Detalles |
|---|---|---|
| product | ObjectId -> Product | Producto afectado |
| type | String | IN (entrada), OUT (salida), ADJUSTMENT (ajuste) |
| quantity | Number | Min 1 |
| previousStock | Number | Stock del producto ANTES del movimiento |
| newStock | Number | Stock del producto DESPUES del movimiento |
| reason | String | Opcional, max 500 caracteres |
| createdBy | ObjectId -> User | Usuario que registro el movimiento |

Indices: `{ product: 1 }`, `{ createdBy: 1 }`, `{ createdAt: -1 }`

previousStock y newStock permiten reconstruir el historial de stock de un producto sin recalcular desde el primer movimiento.

### Colecciones RBAC

**roles**

| Campo | Tipo | Detalles |
|---|---|---|
| name | String | Unico, se guarda en mayusculas |
| description | String | Max 200 caracteres |
| active | Boolean | Default true. Un rol inactivo no puede asignarse |

Indice: `{ name: 1, active: 1 }`

**permissions**

| Campo | Tipo | Detalles |
|---|---|---|
| resource | String | Se guarda en minusculas (users, products, etc.) |
| action | String | Se guarda en minusculas (read, create, update, delete) |
| description | String | Max 200 caracteres |

Indice unico compuesto: `{ resource: 1, action: 1 }`

**userroles**

| Campo | Tipo | Detalles |
|---|---|---|
| user | ObjectId -> User | Usuario que tiene el rol |
| role | ObjectId -> Role | Rol asignado |
| assignedBy | ObjectId -> User | Quien hizo la asignacion (auditoria) |

Indice unico compuesto: `{ user: 1, role: 1 }`

**rolepermissions**

| Campo | Tipo | Detalles |
|---|---|---|
| role | ObjectId -> Role | Rol que tiene el permiso |
| permission | ObjectId -> Permission | Permiso asignado al rol |

Indice unico compuesto: `{ role: 1, permission: 1 }`

### Decisiones de normalizacion

1. **Categoria como ObjectId**: Product.category referencia la coleccion Category via ObjectId, no como string suelto. Permite renombrar categorias sin inconsistencias y hacer populate() para traer el nombre.

2. **RBAC en colecciones separadas**: User no contiene informacion de roles ni permisos. La relacion es N:N via UserRole. Un usuario puede tener multiples roles. Los permisos no se duplican entre roles.

3. **previousStock y newStock en movimientos**: cada movimiento registra el estado del stock antes y despues de la operacion. Permite auditoria directa sin recalcular el historial completo.

---

## 3. Sistema RBAC

### Arquitectura

```
┌──────────────────────┐
│   authorize.js       │  Middleware de Express
│   (middleware)       │
└──────────┬───────────┘
           │ llama
           v
┌──────────────────────┐
│ permission.service   │  Logica de consulta + cache
│                      │
│  getEffective        │
│  Permissions()       │
│                      │
│  ┌────────────────┐  │
│  │  Cache (Map)   │  │  TTL: 5 minutos
│  │  userId -> []  │  │
│  └────────────────┘  │
└──────────┬───────────┘
           │ si no hay cache
           v
┌──────────────────────┐
│  MongoDB             │
│                      │
│  UserRole            │
│    -> RolePermission │
│      -> Permission   │
└──────────────────────┘
```

### Flujo detallado de autorizacion

```
1. La ruta define que permiso necesita:
   router.post('/', authenticate, authorize('products:create'), controller.create);

2. authorize() llama a getEffectivePermissions(userId)

3. getEffectivePermissions busca en cache:
   - Si hay cache valido (TTL < 5 min): retorna permissions
   - Si no hay cache, ejecuta queries:
     a. UserRole.find({ user: userId })           -> obtiene roleIds
     b. RolePermission.find({ role: { $in } })    -> obtiene permissionIds
        .populate('permission')                    -> obtiene resource:action
     c. Deduplica (un usuario con ADMIN + MANAGER puede tener permisos repetidos)
     d. Cachea el resultado con TTL de 5 minutos

4. Verificacion final:
   - Si tiene todos los permisos requeridos -> next()
   - Si le falta alguno -> AppError 403
```

### Tabla de permisos por rol

| Permiso | SUPER_ADMIN | ADMIN | MANAGER | USER |
|---|:---:|:---:|:---:|:---:|
| users:read | si | si | | |
| users:create | si | si | | |
| users:update | si | | | |
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

### Proteccion contra elevacion de privilegios

La validacion se hace en role.service.js via la funcion canAssignRole():

```
Para que ADMIN pueda asignar el rol MANAGER:
1. Obtiene permisos del ADMIN: [products:read, products:create, ...]
2. Obtiene permisos del MANAGER: [products:read, movements:read, movements:create]
3. ADMIN tiene TODOS los permisos de MANAGER? -> Si -> permite

Para que ADMIN intente asignar SUPER_ADMIN:
1. Obtiene permisos del ADMIN
2. Obtiene permisos del SUPER_ADMIN: incluye users:delete, users:assign-role
3. ADMIN no tiene users:delete ni users:assign-role -> rechaza con 403
```

### Invalidacion de cache

El cache de permission.service.js se invalida automaticamente al:
- Asignar un rol: assignRoleToUser() llama a invalidateCache(userId)
- Revocar un rol: revokeRoleFromUser() llama a invalidateCache(userId)

Solo se invalida el cache del usuario afectado, no el de todos.

### Agregar un nuevo permiso

1. Agregar a PERMISSIONS_DATA en seed.js
2. Agregar al rol correspondiente en ROLE_PERMISSIONS_MAP
3. Ejecutar `npm run seed` (idempotente)
4. Usar authorize('recurso:accion') en la ruta

---

## 4. Autenticacion JWT

### Flujo completo

```
┌──────────┐                        ┌──────────┐
│ Cliente  │                        │ Backend  │
└────┬─────┘                        └────┬─────┘
     │                                   │
     │  POST /auth/login                 │
     │  { email, password }              │
     │──────────────────────────────────>│
     │                                   │ Busca usuario por email
     │                                   │ Verifica bloqueo de cuenta
     │                                   │ Compara password con bcrypt
     │                                   │ Genera accessToken (15min)
     │                                   │ Genera refreshToken (7d)
     │                                   │ Hashea refreshToken -> DB
     │                                   │ Consulta roles del usuario
     │  { data: { user, roles,           │
     │    token, refreshToken } }        │
     │<──────────────────────────────────│
     │                                   │
     │  GET /products                    │
     │  Authorization: Bearer <token>    │
     │──────────────────────────────────>│
     │                                   │ authenticate: verifica JWT
     │                                   │ authorize: consulta permisos
     │  { data: [...] }                  │
     │<──────────────────────────────────│
     │                                   │
     │  (token expirado)                 │
     │  POST /auth/refresh               │
     │  { refreshToken }                 │
     │──────────────────────────────────>│
     │                                   │ Verifica firma JWT del refresh
     │                                   │ Compara hash en DB con bcrypt
     │                                   │ Genera nuevo par de tokens
     │                                   │ Rota refreshToken en DB
     │  { data: { token,                 │
     │    refreshToken } }               │
     │<──────────────────────────────────│
```

### Contenido del JWT

```
Access token payload: { id: "userId", iat: ..., exp: ... }

Los permisos NO van en el token.
Se consultan desde DB + cache en cada peticion autenticada.
Esto permite revocar permisos en tiempo real sin esperar
a que el token expire.
```

### Bloqueo de cuenta

```
Intento 1 fallido -> loginAttempts: 1
Intento 2 fallido -> loginAttempts: 2
Intento 3 fallido -> loginAttempts: 3
Intento 4 fallido -> loginAttempts: 4
Intento 5 fallido -> loginAttempts: 0, lockUntil: now + 15min
                     -> HTTP 423 "Cuenta bloqueada temporalmente"

Login exitoso -> loginAttempts: 0, lockUntil: null
```

### Seguridad de la autenticacion

- Contrasenas hasheadas con bcrypt (12 rounds de sal) via hook pre-save del modelo User
- Refresh tokens hasheados con bcrypt (10 rounds) antes de guardar en DB
- Despues de 5 intentos fallidos la cuenta se bloquea por 15 minutos
- El login tiene rate limiter dedicado (10 peticiones / 15 min por IP)
- Los tokens contienen solo { id } (minima informacion, sin permisos)
- Al hacer refresh se rota el refresh token (el anterior queda invalido)
- Al hacer logout se elimina el refresh token de la DB

---

## 5. Capa de servicios

### Responsabilidades

| Service | Responsabilidad |
|---|---|
| auth.service | Registro, login, refresh, logout. Genera tokens, maneja bloqueo de cuenta. |
| user.service | Listar usuarios con roles. Crear usuario con asignacion de rol. |
| product.service | CRUD de productos. Estadisticas del dashboard con aggregation pipeline. |
| movement.service | Crear movimientos de stock con transaccion MongoDB. Registra previousStock y newStock. |
| category.service | Listar categorias activas. Crear categorias. |
| role.service | Listar roles y permisos. Asignar y revocar roles con proteccion contra elevacion. |
| permission.service | Consultar permisos efectivos con cache en memoria (TTL 5 min). Invalidar cache. |

### Reglas de la capa

- Reciben datos planos (strings, objects), nunca req/res
- Lanzan AppError para errores de negocio con statusCode explicito
- No duplican logica que ya resuelve un middleware
- Funciones de maximo 40-50 lineas

### Transacciones en movimientos

movement.service.js usa sesiones de MongoDB para garantizar que la actualizacion del stock y la creacion del movimiento sean atomicas:

```
session = mongoose.startSession()
session.startTransaction()
  -> Product.findById().session(session)
  -> Calcula newStock segun tipo (IN/OUT/ADJUSTMENT)
  -> product.save({ session })
  -> InventoryMovement.create([...], { session })
session.commitTransaction()
// Si algo falla en cualquier paso: session.abortTransaction()
```

Si product.save() tiene exito pero InventoryMovement.create() falla, la transaccion hace rollback y ambos quedan sin cambios.

### Stats con aggregation

product.service.getStats() calcula estadisticas del inventario con una sola query a MongoDB usando aggregation pipeline:

```
Product.aggregate([
  { $group: {
      _id: null,
      totalProducts: { $sum: 1 },
      totalStock: { $sum: '$stock' },
      totalValue: { $sum: { $multiply: ['$price', '$stock'] } },
      lowStock: { $sum: { $cond: [stock > 0 AND stock <= minStock, 1, 0] } },
      outOfStock: { $sum: { $cond: [stock === 0, 1, 0] } },
      categories: { $addToSet: '$category' }
  }},
  { $project: { categories: { $size: '$categories' }, ... }}
])
```

Esto evita cargar todos los documentos en memoria de Node.js. Funciona eficiente con cualquier volumen de datos.

---

## 6. Middleware

### Middlewares globales (app.js)

Se aplican a todas las peticiones en este orden:

| Middleware | Que hace |
|---|---|
| helmet | Configura cabeceras HTTP de seguridad (CSP, HSTS, X-Content-Type) |
| cors | Permite peticiones solo desde CORS_ORIGIN (default: http://localhost:5173) |
| rate-limit global | Limita a 100 peticiones por IP cada 15 minutos |
| body parser | Parsea JSON y URL-encoded (limite de 10kb por peticion) |
| mongoSanitize | Elimina operadores $ y . del body para prevenir inyeccion NoSQL |

### authenticate (middleware/authenticate.js)

```
1. Extrae token del header Authorization: Bearer <token>
2. Verifica la firma del JWT con verifyAccessToken()
3. Busca usuario en DB con select('_id name email status') para optimizar
4. Verifica que status === 'active'
5. Adjunta usuario a req.user para uso en authorize y controllers
6. Si el token es invalido -> AppError 401 "Token invalido"
7. Si el token expiro -> AppError 401 "Token expirado"
8. Si la cuenta no esta activa -> AppError 403
```

### authorize (middleware/authorize.js)

```
1. Recibe permisos requeridos como parametros (e.g. 'products:create')
2. Llama a getEffectivePermissions(req.user._id) de permission.service
3. El service busca en cache primero (TTL 5 min), si no consulta DB
4. Verifica que el usuario tenga TODOS los permisos requeridos
5. Si los tiene -> next()
6. Si le falta alguno -> AppError 403 "No tienes permisos para esta accion"
```

### validate (middleware/validate.js)

```
1. Se coloca DESPUES de los arrays de express-validator y ANTES del controller
2. Ejecuta validationResult() para recopilar errores
3. Si hay errores: retorna 400 con mensajes concatenados
4. Si no hay errores: next()
```

### errorHandler (middleware/errorHandler.js)

Es el ultimo middleware registrado en app.js. Atrapa todos los errores no manejados:

```
1. Detecta tipo de error:
   - CastError (Mongoose) -> 400 "ID no valido"
   - code 11000 (duplicado) -> 409 "Ya existe con ese {campo}"
   - ValidationError (Mongoose) -> 400 con mensajes concatenados
   - AppError -> usa su statusCode y message
   - Cualquier otro -> 500 "Error interno del servidor"
2. En development: log completo del error + stack trace en la respuesta
3. En production: solo el message, nunca stack traces
```

---

## 7. Validaciones

### Tres capas de validacion

```
Capa 1: express-validator (src/validations/)
  -> Formato de datos: tipos, longitud, formato de email, ObjectIds validos
  -> Se ejecuta ANTES del controller
  -> Retorna 400 con mensajes especificos

Capa 2: Mongoose schema validation (src/models/)
  -> Restricciones de datos: required, unique, enum, min, max
  -> Se ejecuta al hacer save/create
  -> errorHandler transforma en 400 o 409

Capa 3: Logica de negocio (src/services/)
  -> Reglas de negocio: stock suficiente, email duplicado, permisos
  -> Lanza AppError con statusCode apropiado
```

### Archivos de validacion

| Archivo | Que valida |
|---|---|
| auth.validation.js | Registro: name, email (formato + normalizeEmail), password (min 6). Login: email, password. Refresh: refreshToken |
| user.validation.js | Crear usuario: name, email, password, roleName (opcional, texto) |
| product.validation.js | Crear: name, sku, category (ObjectId valido), price (>= 0). Actualizar: todos opcionales. ID en params |
| movement.validation.js | Crear: product (ObjectId valido), type (IN/OUT/ADJUSTMENT), quantity (>= 1), reason (opcional) |
| role.validation.js | Asignar/revocar: userId y roleId (ambos ObjectId validos). Param roleId para consultar permisos |

### Ejemplo de flujo completo

```
POST /products { name: "", price: -5, category: "abc" }

1. express-validator detecta:
   - name vacio -> "El nombre es obligatorio"
   - price negativo -> "El precio debe ser >= 0"
   - category no es ObjectId -> "ID de categoria no valido"
   -> Retorna 400 sin llegar al controller

POST /products { name: "Laptop", price: 1000, category: "664f1a2b...", sku: "LAP-001" }

2. Pasa validacion de formato
3. Service verifica: Category.findById("664f1a2b...")
   - Si no existe o no esta activa -> AppError 404 "Categoria no encontrada o inactiva"
   - Si existe -> Product.create()
4. Mongoose verifica: sku unique
   - Si duplicado -> errorHandler -> 409 "Ya existe un registro con ese sku"
```

---

## 8. Manejo de errores

### AppError

Clase que extiende Error para errores operacionales (errores esperados del negocio):

```
throw new AppError('Producto no encontrado', 404);
throw new AppError('Stock insuficiente. Disponible: 5', 400);
throw new AppError('No puedes asignar un rol con permisos que no tienes', 403);
throw new AppError('Cuenta bloqueada temporalmente. Intenta en 12 minutos', 423);
```

El campo isOperational = true distingue errores controlados de bugs. errorHandler usa esto para decidir si mostrar stack trace en development.

### Flujo de errores

```
El servicio detecta un problema
        |
Lanza: throw new AppError('mensaje', statusCode)
        |
El controlador lo atrapa con try-catch
        |
Lo pasa al siguiente middleware: next(error)
        |
El errorHandler lo procesa y envia respuesta JSON:
{ "success": false, "message": "mensaje" }
```

### Codigos HTTP usados

| Codigo | Cuando se usa |
|---|---|
| 200 | Operacion exitosa (listar, actualizar, eliminar, logout) |
| 201 | Recurso creado (registro, crear producto, asignar rol) |
| 400 | Datos invalidos, formato incorrecto, stock insuficiente |
| 401 | Token ausente, invalido o expirado, credenciales incorrectas |
| 403 | Sin permisos RBAC, cuenta desactivada, elevacion de privilegios |
| 404 | Producto, categoria, rol o usuario no encontrado |
| 409 | Email, SKU o asignacion de rol ya existe |
| 423 | Cuenta bloqueada por intentos fallidos de login |
| 429 | Rate limit excedido (global o login) |
| 500 | Error interno no controlado |

---

## 9. Seguridad

### Capas de proteccion (en orden de ejecucion)

```
Internet -> Helmet (headers) -> CORS -> Rate Limit -> Body Parser (10kb)
         -> mongo-sanitize -> express-validator -> authenticate -> authorize
         -> Controller -> Service -> MongoDB
```

### Datos sensibles

Campos con select: false en el schema de User (nunca se incluyen en queries por defecto):
- password: hash bcrypt 12 rounds
- refreshToken: hash bcrypt 10 rounds
- loginAttempts: contador interno
- lockUntil: fecha interna

El metodo toJSON() de User los elimina como segunda capa de seguridad. Tambien elimina el campo legacy `role` que puede existir en documentos anteriores al refactor RBAC.

### Ciclo de vida del refresh token

```
1. Se genera un JWT refresh token con jsonwebtoken
2. Se hashea con bcrypt(refreshToken, 10)
3. El hash se guarda en User.refreshToken en la DB
4. El token original (sin hashear) se envia al cliente
5. Al hacer refresh: bcrypt.compare(tokenRecibido, hashEnDB)
6. Si es valido: se genera nuevo par de tokens (rotacion completa)
7. Al hacer logout: User.refreshToken = null (invalida el refresh)
```

---

## 10. Seed y datos iniciales

### Que crea el seed

```
npm run seed

1. Roles (4):        SUPER_ADMIN, ADMIN, MANAGER, USER
2. Permisos (15):    Combinaciones de resource:action
3. Mapeos (34):      Que permisos tiene cada rol
4. Usuario admin:    admin@inventario.com / Admin123!
5. UserRole:         admin <- SUPER_ADMIN
6. Categorias (8):   Electronica, Perifericos, Mobiliario, Accesorios,
                     Almacenamiento, Software, Redes, Otros
```

### Idempotencia

El seed usa findOneAndUpdate con upsert: true en todos los registros. Si el registro ya existe, lo actualiza. Si no existe, lo crea. Puede ejecutarse multiples veces sin duplicar datos.

---

## 11. Endpoints de la API

### Formato de respuesta unificado

Todas las respuestas usan sendSuccess() de utils/response.js:

Exito:

```json
{
  "success": true,
  "message": "Descripcion de la operacion",
  "data": {}
}
```

Error (via errorHandler):

```json
{
  "success": false,
  "message": "Descripcion del error"
}
```

### Autenticacion (/api/auth)

| Metodo | Ruta | Acceso | Descripcion |
|---|---|---|---|
| POST | /api/auth/register | Publico | Registrar usuario (se asigna rol USER) |
| POST | /api/auth/login | Publico | Iniciar sesion con email y password |
| POST | /api/auth/refresh | Publico | Renovar access token con refresh token |
| POST | /api/auth/logout | Autenticado | Cerrar sesion (invalida refresh token) |

### Usuarios (/api/users)

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | /api/users | users:read | Listar usuarios con sus roles |
| POST | /api/users | users:create | Crear usuario con rol (valida elevacion) |

### Productos (/api/products)

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | /api/products | products:read | Listar productos con categoria y creador |
| GET | /api/products/stats | products:read | Estadisticas del inventario (aggregation) |
| GET | /api/products/:id | products:read | Detalle de un producto |
| POST | /api/products | products:create | Crear producto (category como ObjectId) |
| PUT | /api/products/:id | products:update | Actualizar producto |
| DELETE | /api/products/:id | products:delete | Eliminar producto |

### Categorias (/api/categories)

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | /api/categories | categories:read | Listar categorias activas |
| POST | /api/categories | categories:create | Crear categoria |

### Movimientos (/api/movements)

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | /api/movements | movements:read | Listar movimientos con producto y usuario |
| POST | /api/movements | movements:create | Crear movimiento (actualiza stock con transaccion) |

Tipos de movimiento: IN (suma al stock), OUT (resta del stock), ADJUSTMENT (establece stock).

### Roles y permisos (/api/roles)

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | /api/roles | roles:read | Listar roles activos |
| GET | /api/roles/permissions | roles:read | Listar todos los permisos del sistema |
| GET | /api/roles/:roleId/permissions | roles:read | Permisos de un rol especifico |
| POST | /api/roles/assign | users:assign-role | Asignar rol a usuario (valida elevacion) |
| POST | /api/roles/revoke | users:assign-role | Revocar rol de usuario |

### Health check

| Metodo | Ruta | Acceso | Descripcion |
|---|---|---|---|
| GET | /api/health | Publico | Verificar que la API esta funcionando |

---

## 12. Documentacion del codigo

### Convencion JSDoc aplicada

Todos los archivos del proyecto usan un sistema de documentacion JSDoc con dos niveles:

**Nivel archivo**: cada archivo tiene un bloque `@fileoverview` al inicio que explica:
- Responsabilidad del archivo (que hace y por que existe).
- Relaciones con otros modulos (en modelos: relaciones entre colecciones).
- Reglas de negocio o decisiones de diseno no obvias.
- En controllers: lista de endpoints con entrada y salida esperada.
- En routes: permisos RBAC necesarios y notas de seguridad.
- En validations: que valida cada regla y que se delega al service.

**Nivel funcion**: las funciones con logica compleja tienen JSDoc con:
- Primera linea: que hace la funcion (verbo en infinitivo).
- Bloque Flujo numerado: pasos que ejecuta la funcion.
- @param: tipo entre llaves, nombre con guion, descripcion.
- @returns: tipo de retorno con descripcion.
- @throws: errores AppError que lanza explicitamente con su statusCode.

### Ejemplo de @fileoverview en un modelo

```js
/**
 * @fileoverview Modelo de movimiento de inventario.
 *
 * Responsabilidad:
 * Registra cada cambio de stock en un producto. Funciona como log de auditoria.
 *
 * Relaciones:
 * - InventoryMovement.product --> Product (producto afectado)
 * - InventoryMovement.createdBy --> User (quien registro el movimiento)
 *
 * Tipos de movimiento:
 * - IN: entrada de stock (compra, devolucion). Suma al stock actual.
 * - OUT: salida de stock (venta, perdida). Resta del stock actual.
 * - ADJUSTMENT: ajuste manual. Establece el stock al valor indicado.
 */
```

### Ejemplo de JSDoc en una funcion

```js
/**
 * Crea un movimiento de inventario y actualiza el stock del producto.
 * Usa transaccion de MongoDB para garantizar consistencia.
 *
 * Flujo:
 * 1. Inicia transaccion.
 * 2. Busca el producto y valida stock disponible.
 * 3. Calcula nuevo stock segun tipo (IN, OUT, ADJUSTMENT).
 * 4. Actualiza producto y crea movimiento en la misma transaccion.
 * 5. Commit o rollback.
 *
 * @param {{ product: string, type: string, quantity: number, reason?: string }} data
 * @param {string} userId - ID del usuario que registra el movimiento.
 * @returns {Promise<InventoryMovement>} Movimiento creado.
 * @throws {AppError} 404 producto no encontrado, 400 stock insuficiente para OUT.
 */
```

### Que NO se documenta con JSDoc individual

- Funciones de controller: su estructura try/catch/next es estandar y el @fileoverview ya lista que hace cada endpoint.
- Getters simples de una linea (como category.service.getAll).
- Lineas individuales de codigo.
- Referencias a tickets, issues o tareas temporales.

---

## 13. Scripts disponibles

```bash
npm run dev      # Desarrollo con nodemon (puerto 5000)
npm start        # Produccion
npm run seed     # Crear datos iniciales (idempotente)
```
