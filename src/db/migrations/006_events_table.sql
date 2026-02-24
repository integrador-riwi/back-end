CREATE TABLE IF NOT EXISTS events (
  id_event SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date TIMESTAMP NOT NULL,
  event_end_date TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'UPCOMING',
  event_type VARCHAR(50) NOT NULL DEFAULT 'CAPSTONE',
  cohort VARCHAR(50),
  route VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_type ON events(event_type);

ALTER TABLE events ALTER COLUMN status DROP DEFAULT;
