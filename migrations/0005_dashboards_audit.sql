-- 0005_dashboards_audit.sql · ADR-001 §5–6 — widget catalog, dashboard configs, audit log

CREATE TYPE dashboard_owner AS ENUM ('user', 'team', 'admin_default', 'targeted');

-- Versioned widget catalog; metric definitions live behind query_key server-side
CREATE TABLE widget_catalog (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text NOT NULL,
  version       int  NOT NULL DEFAULT 1,
  widget_type   text NOT NULL,      -- chartjs_line | recharts_bar | sigma_graph | table | stat_tile ...
  query_key     text NOT NULL,      -- server-side query/metric id; no free-text SQL anywhere
  params_schema jsonb NOT NULL DEFAULT '{}',
  status        text NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key, version)
);
CREATE TRIGGER trg_widget_catalog_updated BEFORE UPDATE ON widget_catalog
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Portable schema-versioned JSON configs (PA-22 scaling rule)
CREATE TABLE dashboard_configs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type     dashboard_owner NOT NULL,
  owner_id       uuid,             -- user/team id; NULL for admin_default
  target         jsonb,            -- {"roles":[],"groups":[],"partner_orgs":[]} for 'targeted'
  schema_version int NOT NULL DEFAULT 1,
  config         jsonb NOT NULL,   -- layout + widget instances {catalog key+version, params}
  created_by     uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_owner_shape CHECK (
    (owner_type IN ('user','team') AND owner_id IS NOT NULL)
    OR (owner_type = 'admin_default' AND owner_id IS NULL)
    OR (owner_type = 'targeted' AND target IS NOT NULL)
  )
);
CREATE INDEX idx_dashboards_owner ON dashboard_configs(owner_type, owner_id);
CREATE TRIGGER trg_dashboard_configs_updated BEFORE UPDATE ON dashboard_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Cross-cutting audit log (roles, package_versions, partner_terms, vouchers, dashboard publishes)
-- Append-only; partition by month as volume grows.
CREATE TABLE audit_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id    uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id   text NOT NULL,
  action      text NOT NULL,       -- create | update | delete | publish | rate_change ...
  before      jsonb,
  after       jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_actor  ON audit_log(actor_id, created_at DESC);

CREATE OR REPLACE FUNCTION guard_audit_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_audit_no_update BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION guard_audit_append_only();
