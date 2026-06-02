CREATE TABLE IF NOT EXISTS team_additional_repos (
  id_repo    SERIAL PRIMARY KEY,
  id_team    INTEGER NOT NULL REFERENCES teams(id_team) ON DELETE CASCADE,
  repo_name  VARCHAR(255) NOT NULL,
  repo_url   VARCHAR(500),
  label      VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_additional_repos_team ON team_additional_repos(id_team);
