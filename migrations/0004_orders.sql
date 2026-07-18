-- 0004_orders.sql · ADR-002 — order state machine tables

CREATE TYPE order_state AS ENUM (
  'draft', 'pending_payment', 'payment_failed', 'expired', 'cancelled',
  'paid', 'fulfilling', 'fulfillment_failed', 'fulfilled',
  'refund_pending', 'refunded'
);

CREATE TABLE orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id           uuid NOT NULL,
  catalog_item_id    uuid REFERENCES catalog_items(id),      -- NULL for tier-subscription orders
  package_version_id uuid REFERENCES package_versions(id),   -- set for tier purchases
  qty                int NOT NULL DEFAULT 1 CHECK (qty > 0),
  price_breakdown    jsonb NOT NULL,   -- frozen {data_cost, service_fee, sst, currency} at purchase
  state              order_state NOT NULL DEFAULT 'draft',
  gateway_ref        text,
  idempotency_key    text NOT NULL UNIQUE,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_buyer ON orders(buyer_id, created_at DESC);
CREATE INDEX idx_orders_stuck ON orders(state, updated_at)
  WHERE state IN ('pending_payment', 'fulfilling', 'fulfillment_failed', 'refund_pending');
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Append-only transition log; current state always derivable (ADR-002 rule 2)
CREATE TABLE order_events (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id   uuid NOT NULL REFERENCES orders(id),
  from_state order_state,
  to_state   order_state NOT NULL,
  actor      text NOT NULL,   -- 'user:<id>' | 'gateway:senangpay' | 'reconciler' | 'admin:<id>'
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_events_order ON order_events(order_id, id);

-- DB-level guard: only the transitions ADR-002 allows.
-- App layer is the single writer; this is defense in depth.
CREATE OR REPLACE FUNCTION guard_order_transition() RETURNS trigger AS $$
DECLARE
  allowed boolean;
BEGIN
  IF NEW.state = OLD.state THEN RETURN NEW; END IF;
  allowed := (OLD.state, NEW.state) IN (
    ('draft','pending_payment'), ('draft','cancelled'),
    ('pending_payment','paid'), ('pending_payment','payment_failed'),
    ('pending_payment','expired'), ('pending_payment','cancelled'),
    ('payment_failed','pending_payment'), ('payment_failed','cancelled'),
    ('paid','fulfilling'),
    ('fulfilling','fulfilled'), ('fulfilling','fulfillment_failed'),
    ('fulfillment_failed','fulfilling'), ('fulfillment_failed','refund_pending'),
    ('refund_pending','refunded')
  );
  IF NOT allowed THEN
    RAISE EXCEPTION 'illegal order transition % -> %', OLD.state, NEW.state;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_orders_transition BEFORE UPDATE OF state ON orders
  FOR EACH ROW EXECUTE FUNCTION guard_order_transition();
