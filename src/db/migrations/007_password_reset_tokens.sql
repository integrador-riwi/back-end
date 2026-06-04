-- Migration: Password Reset Tokens
-- Stores single-use, time-limited tokens for password recovery

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER       NOT NULL REFERENCES users(id_user) ON DELETE CASCADE,
  token_hash   VARCHAR(64)   NOT NULL UNIQUE,        -- SHA-256 of the raw token
  expires_at   TIMESTAMPTZ   NOT NULL,
  used_at      TIMESTAMPTZ   DEFAULT NULL,           -- set when consumed
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_user_id    ON password_reset_tokens(user_id);

-- Auto-clean expired/used tokens daily (optional, requires pg_cron extension)
-- SELECT cron.schedule('0 3 * * *', $$DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used_at IS NOT NULL$$);
