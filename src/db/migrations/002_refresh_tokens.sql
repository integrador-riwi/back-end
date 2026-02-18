CREATE TABLE refresh_tokens (
  id_token SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id_user) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  revoked_by INT REFERENCES users(id_user),
  user_agent TEXT,
  ip_address VARCHAR(45)
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
