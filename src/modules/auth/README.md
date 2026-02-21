# Auth Module

Sistema de autenticación con JWT y bcrypt.

---

## POST /api/auth/register

Registra un nuevo usuario en el sistema.

### Request (Body JSON)


| Campo            | Tipo          | Requerido | Descripción                        |
| ---------------- | ------------- | --------- | ----------------------------------- |
| `name`           | string        | ✅        | Nombre completo del usuario         |
| `email`          | string        | ✅        | Email único del usuario            |
| `documentNumber` | string/number | ✅        | Número de documento único         |
| `documentType`   | string        | ❌        | Tipo de documento (default:`"CC"`)  |
| `role`           | string        | ❌        | Rol del usuario (default:`"CODER"`) |
| `clan`           | string        | ❌        | Clan al que pertenece               |

**Nota:** Si no se envía `password`, el sistema usa `documentNumber` como contraseña y la hashea automáticamente.

### Ejemplo

```json
{
  "name": "Juan Perez",
  "email": "juan.perez@riwi.com",
  "documentNumber": "12345678"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id_user": 1,
      "name": "Juan Perez",
      "email": "juan.perez@riwi.com",
      "role": "CODER"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

## POST /api/auth/login

Autentica un usuario y genera tokens de sesión.

### Request (Body JSON)


| Campo      | Tipo   | Requerido | Descripción            |
| ---------- | ------ | --------- | ----------------------- |
| `email`    | string | ✅        | Email del usuario       |
| `password` | string | ✅        | Contraseña del usuario |

### Ejemplo

```json
{
  "email": "juan.perez@riwi.com",
  "password": "12345678"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id_user": 1,
      "name": "Juan Perez",
      "email": "juan.perez@riwi.com",
      "role": "CODER",
      "clan": "G1 (Hamilton)"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Nota:** Los tokens también se envían en cookies httpOnly (`token` y `refreshToken`).

---

## GET /api/auth/me

Obtiene la información del usuario autenticado.

### Request (Headers)


| Header          | Valor            | Descripción                         |
| --------------- | ---------------- | ------------------------------------ |
| `Authorization` | `Bearer <token>` | Token JWT obtenido en login/register |

**Alternativa:** Si usas cookies, el token se envía automáticamente.

### Response

```json
{
  "success": true,
  "data": {
    "id_user": 1,
    "name": "Juan Perez",
    "email": "juan.perez@riwi.com",
    "role": "CODER",
    "document_number": "12345678",
    "document_type": "CC",
    "clan": "G1 (Hamilton)",
    "profile": {
      "id_profile": 1,
      "github_url": null,
      "description": null,
      "clan": "G1 (Hamilton)",
      "user_id": 1
    }
  }
}
```

---

## POST /api/auth/logout

Cierra la sesión del usuario eliminando las cookies de autenticación.

### Request

No requiere body. Opcionalmente puede enviar el header `Authorization`.

### Response

```json
{
  "success": true,
  "data": {
    "message": "Sesión cerrada exitosamente"
  }
}
```

---

## POST /api/auth/refresh

Renueva el token de acceso usando el refresh token.

### Request (Headers)


| Header          | Valor                   | Descripción      |
| --------------- | ----------------------- | ----------------- |
| `Authorization` | `Bearer <refreshToken>` | Refresh token JWT |

### Response

```json
{
  "success": true,
  "data": {
    "message": "Token actualizado",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

## PUT /api/auth/password

Cambia la contraseña del usuario autenticado.

### Request (Headers)


| Header          | Valor            |
| --------------- | ---------------- |
| `Authorization` | `Bearer <token>` |

### Request (Body JSON)


| Campo             | Tipo   | Requerido | Descripción                           |
| ----------------- | ------ | --------- | -------------------------------------- |
| `currentPassword` | string | ✅        | Contraseña actual                     |
| `newPassword`     | string | ✅        | Nueva contraseña (mín. 6 caracteres) |

### Ejemplo

```json
{
  "currentPassword": "12345678",
  "newPassword": "nuevaClave456"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "message": "Contraseña actualizada exitosamente"
  }
}
```

---

## PUT /api/auth/profile

Actualiza el perfil del usuario autenticado.

### Request (Headers)


| Header          | Valor            |
| --------------- | ---------------- |
| `Authorization` | `Bearer <token>` |

### Request (Body JSON)


| Campo         | Tipo   | Requerido | Descripción             |
| ------------- | ------ | --------- | ------------------------ |
| `github_url`  | string | ❌        | URL del perfil de GitHub |
| `description` | string | ❌        | Descripción personal    |
| `clan`        | string | ❌        | Clan al que pertenece    |

### Ejemplo

```json
{
  "github_url": "https://github.com/juanperez",
  "description": "Desarrollador Full Stack",
  "clan": "G3 (Tesla)"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "id_profile": 1,
    "user_id": 1,
    "github_url": "https://github.com/juanperez",
    "description": "Desarrollador Full Stack",
    "clan": "G3 (Tesla)"
  }
}
```

---

## Roles disponibles


| Rol              | Descripción                     |
| ---------------- | -------------------------------- |
| `ADMIN`          | Administrador del sistema        |
| `CODER`          | Estudiante/Coder                 |
| `TL_DEVELOPMENT` | Team Lead de desarrollo técnico |
| `TL_SOFT_SKILLS` | Team Lead de habilidades blandas |
| `TL_ENGLISH`     | Team Lead de inglés             |
| `STAFF`          | Personal de RIWI                 |

---

## Códigos de error


| Código HTTP | Descripción                                         |
| ------------ | ---------------------------------------------------- |
| `400`        | Error de validación (campos faltantes o inválidos) |
| `401`        | No autorizado (token inválido o expirado)           |
| `403`        | Prohibido (sin permisos para la acción)             |
| `409`        | Conflicto (email o documento ya registrado)          |
| `500`        | Error interno del servidor                           |

### Ejemplo de error

```json
{
  "success": false,
  "error": "El email ya está registrado",
  "code": "CONFLICT"
}
```

---

## GitHub OAuth Integration

Permite conectar la cuenta de GitHub del usuario para futuras integraciones (creación de repositorios, invitaciones, etc.).

### Configuración requerida

Agregar al `.env`:
```bash
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3010/api/auth/github/callback
```

Crear OAuth App en GitHub: https://github.com/settings/developers

---

### GET /api/auth/github

Inicia el flujo de OAuth, redirige a GitHub para autorización.

**Request:** Autenticación requerida (Bearer token)

**Response:** Redirección a GitHub

---

### GET /api/auth/github/callback

GitHub redirige aquí con el código de autorización.

**Query params:**
- `code` - Código de autorización de GitHub
- `error` - (opcional) Error si el usuario denegó acceso

**Response:** Redirección al frontend con resultado:
- Éxito: `{CLIENT_URL}/settings/github?success=true&username=gh_username`
- Error: `{CLIENT_URL}/settings/github?error=message`

---

### GET /api/auth/github/status

Obtiene el estado de la conexión con GitHub.

**Request:** Autenticación requerida

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "expired": false,
    "github": {
      "id": "12345678",
      "username": "gh_username",
      "expiresAt": "2026-03-20T10:00:00Z"
    }
  }
}
```

Si no está conectado:
```json
{
  "success": true,
  "data": {
    "connected": false,
    "github": null
  }
}
```

---

### DELETE /api/auth/github

Desconecta la cuenta de GitHub del usuario.

**Request:** Autenticación requerida

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "GitHub account disconnected successfully"
  }
}
```
