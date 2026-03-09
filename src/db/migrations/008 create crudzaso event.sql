-- ============================================================
-- Script: Crear evento Crudzaso y asignar todos los equipos
--
-- Ejecutar en Supabase SQL Editor.
-- Es idempotente — si el evento ya existe no lo duplica.
-- ============================================================

-- 1. Crear el evento Crudzaso
INSERT INTO events (
  title,
  event_name,
  description,
  event_start_date,
  final_delivery_date,
  event_status,
  event_type,
  github_org,
  max_team_size
)
SELECT
  'Crudzaso',
  'Crudzaso',
  'Evento principal de desarrollo — Crudzaso',
  '2025-01-01 00:00:00',
  '2025-12-31 23:59:59',
  'ACTIVE',
  'CAPSTONE',
  NULL,   -- pon aquí el nombre de tu org de GitHub, ej: 'crudzaso-org'
  5
WHERE NOT EXISTS (
  SELECT 1 FROM events WHERE title = 'Crudzaso'
);

-- 2. Asignar TODOS los equipos actuales a Crudzaso (pisa cualquier asignación anterior)
UPDATE teams
SET id_event = (SELECT id_event FROM events WHERE title = 'Crudzaso' LIMIT 1);

-- 3. Asignar TODOS los proyectos actuales a Crudzaso
UPDATE projects
SET id_event = (SELECT id_event FROM events WHERE title = 'Crudzaso' LIMIT 1);

-- 4. Verificación — muestra el resultado
SELECT
  e.id_event,
  e.title,
  e.event_status,
  e.github_org,
  COUNT(t.id_team) AS teams_assigned
FROM events e
LEFT JOIN teams t ON t.id_event = e.id_event
WHERE e.title = 'Crudzaso'
GROUP BY e.id_event, e.title, e.event_status, e.github_org;