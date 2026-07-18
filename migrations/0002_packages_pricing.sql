-- 0002_packages_pricing.sql · ADR-001 §2 — packages, versioned pricing, entitlements

CREATE TYPE billing_cycle AS ENUM ('monthly', 'annual', 'none');       -- 'none' = FOC/Explorer
CREATE TYPE package_status AS ENUM ('draft', 'active', 'retired');
CREATE TYPE entitlement_source AS ENUM ('package', 'topup', 'voucher', 'admin');
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'expired');

CREATE TABLE packages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,            -- Explorer / Pro / Elite
  is_default    boolean NOT NULL DEFAULT false,  -- exactly one Global Default (partial unique below)
  billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',
  status        package_status NOT NULL DEFAULT 'draft',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_packages_default ON packages(is_default) WHERE is_default;
CREATE TRIGGER trg_packages_updated BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Immutable pricing snapshots; a package edit = new version (PA-4)
CREATE TABLE package_versions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id         uuid NOT NULL REFERENCES packages(id),
  version            int  NOT NULL,
  platform_fee_cents bigint NOT NULL DEFAULT 0,      -- e.g. Pro 128800
  currency           char(3) NOT NULL DEFAULT 'MYR',
  entitlement_map    jsonb NOT NULL DEFAULT '{}',    -- {entitlement_key: true|false}
  credit_allowances  jsonb NOT NULL DEFAULT '{}',    -- {"ssm_roc_rob": {"free_per_year": 10}}
  schema_version     int  NOT NULL DEFAULT 1,
  effective_from     timestamptz NOT NULL DEFAULT now(),
  created_by         uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, version)
);

CREATE TABLE subscriptions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id         uuid NOT NULL,                  -- user or team-org id
  package_version_id uuid NOT NULL REFERENCES package_versions(id),
  status             subscription_status NOT NULL DEFAULT 'active',
  started_at         timestamptz NOT NULL DEFAULT now(),
  ends_at            timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscriptions_subject ON subscriptions(subject_id) ;
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Every sellable report/service is a data row, never code (PA-17 scaling rule)
CREATE TABLE catalog_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text NOT NULL UNIQUE,   -- "ssm_roc_rob", "idaman_report", "xb_sg_bizcheck"
  name       text NOT NULL,
  category   text NOT NULL,          -- ssm | idaman | crossborder | docreader | data
  status     package_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_catalog_items_updated BEFORE UPDATE ON catalog_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Decomposed price per item, optionally package-specific (member pricing).
-- Discounts/commissions may ONLY touch service_fee_cents (guardrail rule).
CREATE TABLE item_prices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_item_id  uuid NOT NULL REFERENCES catalog_items(id),
  package_id       uuid REFERENCES packages(id),    -- NULL = default/Explorer price
  data_cost_cents  bigint NOT NULL DEFAULT 0,       -- pass-through, non-discountable
  service_fee_cents bigint NOT NULL DEFAULT 0,      -- margin component
  sst_cents        bigint NOT NULL DEFAULT 0,
  currency         char(3) NOT NULL DEFAULT 'MYR',
  effective_from   timestamptz NOT NULL DEFAULT now(),
  created_by       uuid,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_item_prices_lookup ON item_prices(catalog_item_id, package_id, effective_from DESC);

-- Grants outlive tier changes when persists_after_downgrade (pricing-wiki rule)
CREATE TABLE entitlement_grants (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id               uuid NOT NULL,
  entitlement_key          text NOT NULL,
  source                   entitlement_source NOT NULL,
  source_ref               uuid,                    -- order/voucher id that granted it
  persists_after_downgrade boolean NOT NULL DEFAULT false,
  granted_at               timestamptz NOT NULL DEFAULT now(),
  revoked_at               timestamptz,
  UNIQUE (subject_id, entitlement_key, source)
);
CREATE INDEX idx_entitlement_grants_subject ON entitlement_grants(subject_id) WHERE revoked_at IS NULL;
