# Teams Module

Módulo para la gestión de equipos de desarrollo.

## Tablas Relacionadas

- `teams`: Almacena la información de los equipos
- `team_coders`: Relación many-to-many entre equipos y usuarios

## Estructura

```
teams/
├── teams.routes.js       # Rutas Express
├── teams.controller.js  # Controladores HTTP
├── teams.service.js      # Lógica de negocio
├── teams.repository.js  # Consultas a la base de datos
└── README.md            # Este archivo
```

## Rutas

### Autenticación Requerida
Todas las rutas requieren autenticación con token JWT.

### Endpoints

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/teams` | Listar todos los equipos | ADMIN, TL |
| GET | `/api/teams/my-teams` | Mis equipos | Todos los usuarios |
| GET | `/api/teams/:id` | Ver equipo específico | Miembro, ADMIN, TL |
| GET | `/api/teams/:id/members` | Ver miembros del equipo | Miembro, ADMIN, TL |
| GET | `/api/teams/:id/available` | Ver coders disponibles | ADMIN, TL |
| POST | `/api/teams` | Crear equipo | ADMIN, TL |
| PUT | `/api/teams/:id` | Actualizar equipo | Líder, ADMIN |
| DELETE | `/api/teams/:id` | Eliminar equipo | ADMIN |
| POST | `/api/teams/:id/members` | Agregar miembro | Líder, ADMIN |
| DELETE | `/api/teams/:id/members/:userId` | Eliminar miembro | Líder, ADMIN |

## Roles de Equipo

| Rol | Descripción |
|-----|-------------|
| `LEADER` | Líder del equipo (quien crea el equipo) |
| `DEVELOPER` | Desarrollador miembro del equipo |

## Uso

### Crear un equipo
```bash
curl -X POST http://localhost:3010/api/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "Equipo 1"}'
```

### Obtener mis equipos
```bash
curl -X GET http://localhost:3010/api/teams/my-teams \
  -H "Authorization: Bearer <token>"
```

### Agregar miembro
```bash
curl -X POST http://localhost:3010/api/teams/1/members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"userId": 5, "role": "DEVELOPER"}'
```

## Permisos por Rol de Usuario

| Acción | ADMIN | TL | CODER |
|--------|-------|-----|-------|
| Listar todos los equipos | ✅ | ✅ | ❌ |
| Crear equipo | ✅ | ✅ | ❌ |
| Ver mis equipos | ✅ | ✅ | ✅ |
| Ver equipo específico | ✅ | ✅ | ✅ (solo si es miembro) |
| Actualizar equipo | ✅ | ❌ | ❌ (solo si es líder) |
| Eliminar equipo | ✅ | ❌ | ❌ |
| Agregar miembro | ✅ | ❌ | ❌ (solo si es líder) |
| Eliminar miembro | ✅ | ❌ | ❌ (solo si es líder) |
