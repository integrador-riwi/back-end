CREATE TABLE IF NOT EXISTS team_join_requests (
  id_request SERIAL PRIMARY KEY,
  id_team INTEGER NOT NULL REFERENCES teams(id_team) ON DELETE CASCADE,
  id_user INTEGER NOT NULL REFERENCES users(id_user) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(id_team, id_user)
);

CREATE INDEX idx_team_join_requests_team ON team_join_requests(id_team);
CREATE INDEX idx_team_join_requests_user ON team_join_requests(id_user);
CREATE INDEX idx_team_join_requests_status ON team_join_requests(status);
