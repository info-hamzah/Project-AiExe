-- 0008_sneakpeek_events.sql — sneak-peek funnel events (PA-1/PA-2 instrumentation).
-- Postgres locally; production target is DynamoDB with nightly aggregation (ADR-001 §7).

CREATE TYPE sneakpeek_event_type AS ENUM ('impression', 'cta_click');

CREATE TABLE sneakpeek_events (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         uuid NOT NULL,
  entitlement_key text NOT NULL,
  event           sneakpeek_event_type NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sneakpeek_user ON sneakpeek_events(user_id, created_at DESC);
CREATE INDEX idx_sneakpeek_key ON sneakpeek_events(entitlement_key, event, created_at DESC);
