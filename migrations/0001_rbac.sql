-- 0001_rbac.sql · ADR-001 §1 — RBAC core
-- Tool-agnostic plain SQL (PostgreSQL / RDS). Run in order 0001→0005.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Shared updated_at trigger used by all tables
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  description text,
  is_system   boolean NOT NULL DEFAULT false, -- guards bootstrap roles from deletion
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_roles_updated BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Permissions are registered by modules as namespaced keys: "module.action"
CREATE TABLE permissions (
  key         text PRIMARY KEY CHECK (key ~ '^[a-z0-9_]+\.[a-z0-9_]+$'),
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
  role_id        uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE user_roles (
  user_id    uuid NOT NULL, -- references users(id) in the existing user store
  role_id    uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);

-- Prevent deleting system roles
CREATE OR REPLACE FUNCTION guard_system_role() RETURNS trigger AS $$
BEGIN
  IF OLD.is_system THEN
    RAISE EXCEPTION 'system role % cannot be deleted', OLD.name;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_roles_guard_system BEFORE DELETE ON roles
  FOR EACH ROW EXECUTE FUNCTION guard_system_role();
