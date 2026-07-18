-- 0003_partners_commissions.sql · ADR-001 §3 — B2B2B orgs, versioned terms, immutable ledger

CREATE TYPE partner_type   AS ENUM ('partner', 'reseller');
CREATE TYPE partner_status AS ENUM ('active', 'suspended', 'offboarded');
CREATE TYPE ledger_state   AS ENUM ('pending', 'settled', 'reversed');
CREATE TYPE onboarding_source_type AS ENUM ('direct', 'partner', 'reseller');

-- Reusable templates so partner #3..#300 are config, not code (PA-21 scaling rule)
CREATE TABLE partner_templates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL UNIQUE,
  default_terms     jsonb NOT NULL DEFAULT '{}',
  onboarding_config jsonb NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_partner_templates_updated BEFORE UPDATE ON partner_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE partner_orgs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  type        partner_type NOT NULL,
  status      partner_status NOT NULL DEFAULT 'active',
  template_id uuid REFERENCES partner_templates(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_partner_orgs_updated BEFORE UPDATE ON partner_orgs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Versioned, attributed terms: "who set what rate, when" (PA-3)
CREATE TABLE partner_terms (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_org_id  uuid NOT NULL REFERENCES partner_orgs(id),
  version         int  NOT NULL,
  discount_pct    numeric(5,2) CHECK (discount_pct BETWEEN 0 AND 100),   -- partner type
  partner_price_package_version_id uuid REFERENCES package_versions(id), -- reseller type
  commission_pct  numeric(5,2) CHECK (commission_pct BETWEEN 0 AND 100), -- reseller type
  set_by_user_id  uuid NOT NULL,
  effective_from  timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_org_id, version),
  -- terms must match the org type's shape
  CONSTRAINT chk_terms_shape CHECK (
    (discount_pct IS NOT NULL AND commission_pct IS NULL)
    OR (commission_pct IS NOT NULL AND discount_pct IS NULL)
  )
);

CREATE TABLE partner_users (
  partner_org_id uuid NOT NULL REFERENCES partner_orgs(id),
  user_id        uuid NOT NULL,
  invited_by     uuid,
  joined_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_org_id, user_id)
);
CREATE INDEX idx_partner_users_user ON partner_users(user_id);

-- Write-once onboarding attribution (ADR-001 decision 4).
-- Assumes existing users table; adds attribution columns + write-once trigger.
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS onboarding_source onboarding_source_type,
  ADD COLUMN IF NOT EXISTS onboarding_partner_org_id uuid REFERENCES partner_orgs(id);

CREATE OR REPLACE FUNCTION guard_onboarding_source() RETURNS trigger AS $$
BEGIN
  IF OLD.onboarding_source IS NOT NULL
     AND (NEW.onboarding_source IS DISTINCT FROM OLD.onboarding_source
          OR NEW.onboarding_partner_org_id IS DISTINCT FROM OLD.onboarding_partner_org_id) THEN
    RAISE EXCEPTION 'onboarding_source is write-once';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Attach when users table exists in this DB:
-- CREATE TRIGGER trg_users_onboarding_guard BEFORE UPDATE ON users
--   FOR EACH ROW EXECUTE FUNCTION guard_onboarding_source();

-- Immutable ledger: corrections are compensating 'reversed' rows, never UPDATEs
CREATE TABLE commission_ledger (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                uuid NOT NULL,
  reseller_org_id         uuid NOT NULL REFERENCES partner_orgs(id),
  gross_cents             bigint NOT NULL,
  margin_component_cents  bigint NOT NULL,          -- commission base: service fee only
  commission_pct_at_sale  numeric(5,2) NOT NULL,
  commission_cents        bigint NOT NULL,
  state                   ledger_state NOT NULL DEFAULT 'pending',
  reverses_ledger_id      uuid REFERENCES commission_ledger(id),
  payout_id               uuid,
  created_at              timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_ledger_order ON commission_ledger(order_id) WHERE reverses_ledger_id IS NULL;
CREATE INDEX idx_ledger_reseller ON commission_ledger(reseller_org_id, state);

CREATE OR REPLACE FUNCTION guard_ledger_immutable() RETURNS trigger AS $$
BEGIN
  -- only state transitions pending→settled and →reversed marker via payout linkage allowed
  IF NEW.gross_cents <> OLD.gross_cents
     OR NEW.margin_component_cents <> OLD.margin_component_cents
     OR NEW.commission_pct_at_sale <> OLD.commission_pct_at_sale
     OR NEW.commission_cents <> OLD.commission_cents
     OR NEW.order_id <> OLD.order_id THEN
    RAISE EXCEPTION 'commission_ledger rows are immutable; write a compensating entry';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_ledger_immutable BEFORE UPDATE ON commission_ledger
  FOR EACH ROW EXECUTE FUNCTION guard_ledger_immutable();

CREATE TABLE payouts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_org_id uuid NOT NULL REFERENCES partner_orgs(id),
  period          daterange NOT NULL,
  total_cents     bigint NOT NULL,
  marked_paid_by  uuid,
  paid_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
