-- 0006_users.sql — revamp-owned users table (ground-up build owns identity;
-- supersedes the "existing user store" assumption in ADR-001).

CREATE TABLE IF NOT EXISTS users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Attribution columns from 0003 (its ALTER was a no-op when users didn't exist yet)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_source onboarding_source_type,
  ADD COLUMN IF NOT EXISTS onboarding_partner_org_id uuid REFERENCES partner_orgs(id);

-- Attach the write-once guard defined in 0003
CREATE TRIGGER trg_users_onboarding_guard BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION guard_onboarding_source();
