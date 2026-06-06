ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN teams.closed_at IS
  'When set, the team is closed to new joins and hidden from open-team discovery.';
