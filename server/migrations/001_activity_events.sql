CREATE TABLE IF NOT EXISTS activity_events (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  event_id UUID NOT NULL,
  idempotency_key UUID NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  domain VARCHAR(253) NOT NULL,
  url_hash CHAR(64),
  title VARCHAR(240),
  duration_sec INTEGER NOT NULL DEFAULT 0 CHECK (duration_sec >= 0 AND duration_sec <= 86400),
  category VARCHAR(32) NOT NULL,
  device VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, event_id),
  UNIQUE(user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS activity_events_user_ts_idx ON activity_events(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS activity_events_user_category_idx ON activity_events(user_id, category, ts DESC);
