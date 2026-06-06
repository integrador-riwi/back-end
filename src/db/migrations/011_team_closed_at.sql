ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN teams.closed_at IS
  'Timestamp when a team was closed to new invitations and join requests. NULL means open.';
