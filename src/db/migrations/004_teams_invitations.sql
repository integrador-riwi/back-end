CREATE TABLE IF NOT EXISTS team_invitations (
  id_invitation SERIAL PRIMARY KEY,
  id_team INTEGER NOT NULL REFERENCES teams(id_team) ON DELETE CASCADE,
  id_user INTEGER NOT NULL REFERENCES users(id_user) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  invited_by INTEGER NOT NULL REFERENCES users(id_user),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(id_team, id_user)
);

CREATE TABLE IF NOT EXISTS team_projects (
  id_project SERIAL PRIMARY KEY,
  id_team INTEGER NOT NULL REFERENCES teams(id_team) ON DELETE CASCADE,
  repo_name VARCHAR(255),
  repo_url VARCHAR(500),
  github_invite_token VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(id_team)
);

CREATE INDEX idx_team_invitations_team ON team_invitations(id_team);
CREATE INDEX idx_team_invitations_user ON team_invitations(id_user);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);
