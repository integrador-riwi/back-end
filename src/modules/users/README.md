# Users Module

Manejo de usuarios del sistema. Solo administradores pueden gestionar usuarios.

## Endpoints

| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | `/api/users` | ✅ | ADMIN | Listar usuarios con filtros y paginación |
| GET | `/api/users/stats` | ✅ | ADMIN | Estadísticas de usuarios |
| GET | `/api/users/available` | ✅ | CODER, ADMIN, TL_* | Coders sin equipo |
| GET | `/api/users/me` | ✅ | Todos | Perfil propio |
| GET | `/api/users/:id` | ✅ | ADMIN | Detalle de usuario |
| POST | `/api/users` | ✅ | ADMIN | Crear usuario |
| PUT | `/api/users/:id` | ✅ | ADMIN | Actualizar usuario |
| PUT | `/api/users/:id/password` | ✅ | ADMIN | Cambiar contraseña |
| PUT | `/api/users/:id/status` | ✅ | ADMIN | Activar/desactivar |

## Filtros y Paginación

### GET /api/users

**Query params:**
- `role` - Filtrar por rol (ADMIN, CODER, TL_DEVELOPMENT, TL_SOFT_SKILLS, TL_ENGLISH, STAFF)
- `clan` - Filtrar por clan (búsqueda parcial)
- `isActive` - Filtrar por estado (true/false)
- `search` - Buscar por nombre o email
- `page` - Número de página (default: 1)
- `limit` - Usuarios por página (default: 10)

**Ejemplo:**
```
GET /api/users?role=CODER&clan=Alpha&page=1&limit=20
```

**Response:**
```json
{
  "status": "success",
  "message": "Usuarios obtenidos exitosamente",
  "data": {
    "users": [
      {
        "id_user": 1,
        "name": "Juan Pérez",
        "email": "juan@riwi.io",
        "role": "CODER",
        "clan": "Alpha",
        "is_active": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

## Crear Usuario

### POST /api/users

**Body:**
```json
{
  "name": "Juan Pérez",
  "email": "juan@riwi.io",
  "password": "SecurePass123",
  "role": "CODER",
  "documentNumber": "1234567890",
  "documentType": "CC",
  "clan": "Alpha"
}
```

**Notas:**
- Si no se envía `password`, se usa el `documentNumber` como contraseña
- `documentType` puede ser: CC, CE, TI, PP

## Activar/Desactivar

### PUT /api/users/:id/status

**Body:**
```json
{
  "isActive": false
}
```

**Restricciones:**
- No puedes desactivar tu propia cuenta

## Coders Disponibles

### GET /api/users/available

Retorna coders que no pertenecen a ningún equipo.

**Query params:**
- `search` - Buscar por nombre o email
- `page` - Número de página
- `limit` - Resultados por página

**Response:**
```json
{
  "status": "success",
  "data": {
    "coders": [
      {
        "id_user": 5,
        "name": "María García",
        "email": "maria@riwi.io",
        "clan": "Beta",
        "github_url": "https://github.com/maria"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

## Errores

| Código | Mensaje |
|--------|---------|
| 400 | Nombre, email y número de documento son requeridos |
| 400 | Rol inválido. Roles válidos: ADMIN, CODER, ... |
| 404 | Usuario no encontrado |
| 409 | El email ya está registrado |
| 409 | El número de documento ya está registrado |
| 403 | No puedes desactivar tu propia cuenta |
